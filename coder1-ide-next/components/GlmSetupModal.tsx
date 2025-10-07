'use client';

import React from 'react';
import { X, ExternalLink } from '@/lib/icons';

interface GlmSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlmSetupModal({ isOpen, onClose }: GlmSetupModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="relative max-w-2xl w-full bg-bg-secondary rounded-lg p-6 shadow-2xl border border-cyan-500/50">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-cyan-400 mb-1">
              GLM 4.6 Overflow Backend Setup
            </h2>
            <p className="text-sm text-gray-400">
              For Claude Code Pro users who frequently hit rate limits
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Key Benefits */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-cyan-300 font-semibold mb-2">💡 Why GLM 4.6?</p>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• <strong>10x Cheaper:</strong> $0.10/M tokens vs $1-3/M for Claude</li>
            <li>• <strong>Same Quality:</strong> Comparable to Claude Sonnet 4.5</li>
            <li>• <strong>No Limits:</strong> Use when you hit Claude rate limits</li>
            <li>• <strong>Seamless Switch:</strong> Change models anytime in Terminal Settings</li>
          </ul>
        </div>

        {/* Setup Steps */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white mb-2">Setup Steps:</h3>
          
          <div className="space-y-2">
            {/* Step 1 */}
            <div className="bg-bg-primary rounded p-3">
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">1.</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-300 mb-1">Get Z.AI API Key</p>
                  <a 
                    href="https://z.ai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Sign up at z.ai <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-bg-primary rounded p-3">
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">2.</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-300 mb-2">Configure Environment</p>
                  <p className="text-xs text-gray-400 mb-1">Add to <code className="text-cyan-400">.env.local</code>:</p>
                  <div className="bg-black rounded p-2 font-mono text-xs">
                    <div className="text-gray-400">USE_GLM_BACKEND=<span className="text-green-400">true</span></div>
                    <div className="text-gray-400">ZAI_API_KEY=<span className="text-yellow-400">your-api-key-here</span></div>
                    <div className="text-gray-400">ZAI_BASE_URL=<span className="text-blue-400">https://api.z.ai/api/anthropic</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-bg-primary rounded p-3">
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">3.</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-300 mb-1">Restart IDE</p>
                  <div className="bg-black rounded p-2 font-mono text-xs">
                    <span className="text-green-400">$</span> <span className="text-white">npm run dev</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-bg-primary rounded p-3">
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">4.</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">Switch to GLM 4.6</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Open Terminal Settings (gear icon) → Select "GLM 4.6" from model dropdown
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-border-default flex justify-between items-center">
          <p className="text-xs text-gray-500">
            See <code className="text-cyan-400">.env.local.example</code> for full documentation
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-500 text-black rounded-md hover:bg-cyan-400 transition-colors font-semibold text-sm"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
