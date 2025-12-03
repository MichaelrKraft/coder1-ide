/**
 * Parallel Exploration Modal
 * 
 * UI for configuring and launching parallel exploration sessions.
 * Does NOT modify existing SandboxPanel - this is a new, separate modal.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Cpu, DollarSign, Sparkles, AlertCircle } from 'lucide-react';
import { useAPIKeyStatus } from '@/hooks/useAPIKeyStatus';
import { APIKeySetupModal } from '@/components/settings/APIKeySetupModal';

interface ParallelExplorationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: {
    task: string;
    count: number;
    budget: 'cost-optimized' | 'balanced' | 'quality-optimized';
  }) => void;
}

export default function ParallelExplorationModal({
  isOpen,
  onClose,
  onStart
}: ParallelExplorationModalProps) {
  const [task, setTask] = useState('');
  const [count, setCount] = useState(3);
  const [budget, setBudget] = useState<'cost-optimized' | 'balanced' | 'quality-optimized'>('balanced');
  const [showSetup, setShowSetup] = useState(false);
  const [mounted, setMounted] = useState(false);

  const apiKeyStatus = useAPIKeyStatus();

  // Ensure component is mounted before using createPortal (SSR safety)
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Log API key status on every render
  console.log('[ParallelExploration] 📋 Current state:', {
    isOpen,
    hasAnyKey: apiKeyStatus.hasAnyKey,
    activeProvider: apiKeyStatus.activeProvider
  });

  // Don't render anything on server or if not open
  if (!mounted || !isOpen) return null;

  // Show setup if no keys are configured OR user clicked "Change"
  if (!apiKeyStatus.hasAnyKey || showSetup) {
    return createPortal(
      <APIKeySetupModal
        isOpen={true}
        onClose={() => {
          setShowSetup(false);
          if (!apiKeyStatus.hasAnyKey) {
            onClose();
          }
        }}
        onComplete={() => {
          console.log('[ParallelExploration] ✅ Setup completed, keys should be detected now');
          setShowSetup(false);
          // apiKeyStatus will update automatically, component will re-render
        }}
      />,
      document.body
    );
  }

  const budgetOptions = [
    {
      value: 'cost-optimized' as const,
      label: 'Cost Optimized',
      model: 'Claude Haiku 4.5',
      cost: '$',
      description: '3x cheaper, 85% quality',
      icon: DollarSign
    },
    {
      value: 'balanced' as const,
      label: 'Balanced',
      model: 'Claude Sonnet 4',
      cost: '$$',
      description: 'Best price/performance (recommended)',
      icon: Zap
    },
    {
      value: 'quality-optimized' as const,
      label: 'Quality',
      model: 'Claude Opus 4',
      cost: '$$$',
      description: 'Highest quality, deeper thinking',
      icon: Sparkles
    }
  ];

  const selectedBudget = budgetOptions.find(opt => opt.value === budget)!;

  const handleStart = () => {
    console.log('[ParallelExploration] 🚀 Start button clicked');
    
    if (!task.trim()) {
      console.log('[ParallelExploration] ⚠️ No task description provided');
      alert('Please describe what you want to explore');
      return;
    }

    console.log('[ParallelExploration] ✅ Calling onStart with:', { task: task.trim(), count, budget });
    onStart({ task: task.trim(), count, budget });
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border-default rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default bg-bg-tertiary">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-coder1-cyan" />
            <h2 className="text-lg font-semibold text-text-primary">
              Parallel Exploration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-primary rounded transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* API Key Warning Banner */}
          {!apiKeyStatus.hasAnyKey && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-300 font-semibold mb-1">
                  API Key Required
                </p>
                <p className="text-xs text-yellow-200/80 mb-2">
                  You need to configure either a GLM or Anthropic API key to use the AI Team feature.
                </p>
                <button
                  onClick={() => setShowSetup(true)}
                  className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-medium rounded transition-colors"
                >
                  Configure API Key
                </button>
              </div>
            </div>
          )}
          
          {/* Provider Status Badge */}
          {apiKeyStatus.hasAnyKey && (
            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-300">
                  Using: <span className="font-semibold">
                    {apiKeyStatus.activeProvider === 'glm' ? 'GLM 4.6' : 'Anthropic Claude'}
                  </span>
                  {apiKeyStatus.activeProvider === 'glm' && (
                    <span className="text-xs text-green-400 ml-2">(30x cheaper)</span>
                  )}
                </span>
              </div>
              <button
                onClick={() => setShowSetup(true)}
                className="text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                Change
              </button>
            </div>
          )}
          {/* Description */}
          <div className="text-sm text-text-secondary">
            Spawn multiple Claude Code agents in parallel sandboxes to explore different approaches to your task. 
            Each agent will create a unique variation based on distinct strategies.
          </div>

          {/* Task Input */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              What do you want to explore?
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g., Create a landing page for a project management SaaS&#10;e.g., Design 4 different approaches to a chat API&#10;e.g., Show me variations of this pricing page"
              className="w-full h-32 px-3 py-2 bg-bg-primary border border-border-default rounded text-text-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-coder1-cyan/50"
            />
            <div className="mt-1 text-xs text-text-muted">
              Be specific about what you want. The more context you provide, the better the variations.
            </div>
          </div>

          {/* Variation Count */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Number of variations: <span className="text-coder1-cyan">{count}</span>
            </label>
            <input
              type="range"
              min="2"
              max="5"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="w-full h-2 bg-bg-primary rounded-lg appearance-none cursor-pointer accent-coder1-cyan"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>2 (faster)</span>
              <span>3 (balanced)</span>
              <span>4 (more options)</span>
              <span>5 (maximum)</span>
            </div>
          </div>

          {/* Budget Selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Quality vs Cost
            </label>
            <div className="grid grid-cols-3 gap-3">
              {budgetOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setBudget(option.value)}
                  className={`
                    p-3 rounded border transition-all
                    ${budget === option.value
                      ? 'border-coder1-cyan bg-coder1-cyan/10'
                      : 'border-border-default bg-bg-tertiary hover:border-border-hover'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-2">
                    <option.icon className={`w-5 h-5 ${budget === option.value ? 'text-coder1-cyan' : 'text-text-secondary'}`} />
                    <div className="text-xs font-medium text-text-primary">{option.label}</div>
                    <div className="text-xs text-text-muted">{option.cost}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 p-3 bg-bg-tertiary rounded border border-border-default">
              <div className="text-xs font-medium text-text-primary mb-1">
                {selectedBudget.model}
              </div>
              <div className="text-xs text-text-secondary">
                {selectedBudget.description}
              </div>
            </div>
          </div>

          {/* Time Estimate */}
          <div className="p-3 bg-bg-tertiary rounded border border-border-default">
            <div className="text-xs font-medium text-text-primary mb-1">
              ⏱️ Estimated time
            </div>
            <div className="text-xs text-text-secondary">
              {count <= 2 ? '2-3 minutes' : count === 3 ? '3-4 minutes' : count === 4 ? '4-5 minutes' : '5-6 minutes'} for {count} variations
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={!task.trim() || !apiKeyStatus.hasAnyKey}
              className="px-6 py-2 bg-gradient-to-r from-coder1-cyan to-blue-500 text-white text-sm font-medium rounded hover:from-coder1-cyan-secondary hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {!apiKeyStatus.hasAnyKey ? 'Configure API Key First' : 'Start Exploration'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
