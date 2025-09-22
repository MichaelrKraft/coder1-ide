'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Sparkles, Brain, FileCode, GitBranch, Zap } from 'lucide-react';
import deepContextService, { DeepContextSearchResult, DeepContextRelationship } from '@/services/deepcontext-service';

interface DeepContextPanelProps {
  activeFile?: string | null;
}

export default function DeepContextPanel({ activeFile }: DeepContextPanelProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DeepContextSearchResult[]>([]);
  const [relationships, setRelationships] = useState<DeepContextRelationship[]>([]);
  const [status, setStatus] = useState(deepContextService.getStatus());
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Listen for status changes
  useEffect(() => {
    const updateStatus = () => {
      const newStatus = deepContextService.getStatus();
      console.log('DeepContext status update:', newStatus);
      setStatus(newStatus);
    };
    
    deepContextService.on('install:start', updateStatus);
    deepContextService.on('install:complete', updateStatus);
    deepContextService.on('indexing:start', updateStatus);
    deepContextService.on('indexing:progress', updateStatus);
    deepContextService.on('indexing:complete', updateStatus);
    
    // Check initial status and update component
    deepContextService.checkInstallation().then(() => {
      updateStatus();
    });
    
    return () => {
      deepContextService.removeListener('install:start', updateStatus);
      deepContextService.removeListener('install:complete', updateStatus);
      deepContextService.removeListener('indexing:start', updateStatus);
      deepContextService.removeListener('indexing:progress', updateStatus);
      deepContextService.removeListener('indexing:complete', updateStatus);
    };
  }, []);

  // Load relationships when active file changes
  useEffect(() => {
    if (activeFile && status.indexed) {
      deepContextService.getRelationships(activeFile).then(setRelationships);
    }
  }, [activeFile, status.indexed]);

  // Search handler
  const handleSearch = useCallback(async () => {
    console.log('DeepContext search triggered:', { query, status });
    if (!query.trim()) {
      console.log('Empty query, skipping search');
      return;
    }
    
    // Check if DeepContext would be helpful but not installed
    if (!status.installed && deepContextService.wouldBeHelpful(query)) {
      console.log('DeepContext not installed, showing upgrade prompt');
      setShowUpgradePrompt(true);
      // Don't return - still perform basic search
    }
    
    setSearching(true);
    try {
      console.log('Calling deepContextService.search with query:', query);
      const searchResults = await deepContextService.search(query);
      console.log('Search results:', searchResults);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  }, [query, status.installed]);

  // Install handler
  const handleInstall = useCallback(async () => {
    setShowUpgradePrompt(false);
    await deepContextService.installDeepContext();
  }, []);

  // Not installed state - show upgrade prompt
  if (!status.installed && showUpgradePrompt) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-[2px] rounded-xl">
              <div className="bg-bg-primary rounded-xl p-6 space-y-4">
                <div className="text-center space-y-2">
                  <Sparkles className="w-12 h-12 text-yellow-400 mx-auto animate-pulse" />
                  <h3 className="text-xl font-bold text-white">
                    ⚡ Upgrade Available!
                  </h3>
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    Click to add Advanced Semantic Search for FREE
                  </p>
                </div>

                <div className="space-y-3 text-sm text-text-secondary">
                  <div className="flex items-start gap-2">
                    <Brain className="w-4 h-4 text-purple-400 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">Find code by meaning, not just text</p>
                      <p className="text-xs">Understands "payment processing" vs searching for "payment"</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <GitBranch className="w-4 h-4 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">See how functions connect</p>
                      <p className="text-xs">Visual code relationships and dependencies</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">10x more accurate results</p>
                      <p className="text-xs">AI-powered understanding of your codebase</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleInstall}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-[1.02] shadow-lg"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Activate FREE Semantic Search
                    </span>
                  </button>
                  <button
                    onClick={() => setShowUpgradePrompt(false)}
                    className="w-full py-2 text-text-muted text-sm hover:text-text-secondary transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>

                <p className="text-xs text-text-muted text-center">
                  Installs in background • 50MB • No configuration needed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Installing state
  if (status.installed && status.indexing) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Brain className="w-16 h-16 text-purple-400 mx-auto animate-pulse" />
            <h3 className="text-lg font-semibold">🧠 DeepContext is analyzing your codebase...</h3>
            <p className="text-sm text-text-secondary">Building semantic understanding of your code</p>
            <div className="w-64 mx-auto">
              <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-300"
                  style={{ width: `${status.progress || 0}%` }}
                />
              </div>
              <p className="text-xs text-text-muted mt-2">{status.progress || 0}% complete</p>
            </div>
            <p className="text-xs text-text-muted">This one-time indexing takes 30-60 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // Main DeepContext interface
  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-border-default">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ask about your code..."
            className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-border-default rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:border-purple-400 transition-colors"
          />
          {status.indexed && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="text-xs text-green-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Semantic
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Current File Context */}
        {activeFile && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              📍 Currently viewing: {activeFile}
            </h3>
            
            {/* File Relationships */}
            {relationships.length > 0 && (
              <div className="bg-bg-tertiary rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-medium text-text-primary">Related files:</h4>
                {relationships.slice(0, 5).map((rel, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted">•</span>
                    <span className="text-purple-400">{rel.type}:</span>
                    <span className="text-text-secondary">{rel.file}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Search Results
            </h3>
            {results.map((result, i) => (
              <div key={i} className="bg-bg-tertiary rounded-lg p-3 hover:bg-bg-secondary transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium text-purple-400">{result.file}</span>
                  <span className="text-xs text-text-muted">Line {result.line}</span>
                </div>
                <pre className="text-xs text-text-secondary font-mono overflow-hidden whitespace-pre-wrap">
                  {result.content}
                </pre>
                {result.context && (
                  <p className="text-xs text-text-muted mt-2">{result.context}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!activeFile && results.length === 0 && !searching && (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="space-y-3">
              <Brain className="w-12 h-12 text-purple-400 mx-auto opacity-50" />
              <p className="text-sm text-text-secondary">
                {status.indexed 
                  ? "Ask questions about your code using natural language"
                  : "DeepContext is getting ready..."
                }
              </p>
              <div className="text-xs text-text-muted space-y-1">
                <p>Try: "where is user authentication?"</p>
                <p>Or: "find all API endpoints"</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Not Installed Prompt (subtle) */}
      {!status.installed && !showUpgradePrompt && (
        <div className="p-3 bg-gradient-to-r from-purple-600/10 to-blue-600/10 border-t border-purple-400/20">
          <button
            onClick={() => setShowUpgradePrompt(true)}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-text-secondary">
                Using basic search
              </span>
            </div>
            <span className="text-xs font-medium text-purple-400 group-hover:text-purple-300 transition-colors">
              Upgrade to Semantic Search FREE →
            </span>
          </button>
        </div>
      )}
    </div>
  );
}