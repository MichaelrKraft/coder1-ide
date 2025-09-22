'use client';

import React from 'react';
import deepContextService from '@/services/deepcontext-service';

interface TerminalUpgradePromptProps {
  query: string;
  onInstall?: () => void;
  onDismiss?: () => void;
}

export default function TerminalUpgradePrompt({ 
  query, 
  onInstall,
  onDismiss 
}: TerminalUpgradePromptProps) {
  
  const handleInstall = async () => {
    await deepContextService.installDeepContext();
    onInstall?.();
  };

  return (
    <div className="mt-4 mb-4">
      <div className="border-2 border-purple-500/50 rounded-lg bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚡</span>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white mb-2">
              Upgrade Available!
            </h3>
            <p className="text-xs text-purple-300 font-semibold mb-3">
              Click to add Advanced Semantic Search for FREE
            </p>
            <div className="space-y-2 text-xs text-gray-400">
              <p>• Find code by meaning, not just text</p>
              <p>• See how functions connect</p>
              <p>• 10x more accurate results</p>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold rounded hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                🚀 Add Now - FREE
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2 text-gray-500 text-xs hover:text-gray-400 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}