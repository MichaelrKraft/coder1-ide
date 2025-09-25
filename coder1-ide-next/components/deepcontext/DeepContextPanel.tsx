'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Sparkles, Brain, FileCode, GitBranch, Zap, Clock, Star, X, SearchX } from 'lucide-react';
import deepContextService, { DeepContextSearchResult, DeepContextRelationship } from '@/services/deepcontext-service';

interface DeepContextPanelProps {
  activeFile?: string | null;
  onOpenFile?: (path: string, line?: number) => void;
}

interface SavedQuery {
  query: string;
  timestamp: number;
  label?: string;
}

// Simple syntax highlighting function
function highlightCode(code: string, type?: string): string {
  // Escape HTML
  let highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Keywords
  highlighted = highlighted.replace(
    /\b(const|let|var|function|class|interface|type|enum|export|import|from|return|if|else|for|while|try|catch|async|await|new|this|super|extends|implements)\b/g,
    '<span style="color: #ff79c6;">$1</span>'
  );
  
  // Strings (simple regex, won't catch all cases)
  highlighted = highlighted.replace(
    /(["'])(?:(?=(\\?))\2.)*?\1/g,
    '<span style="color: #f1fa8c;">$&</span>'
  );
  
  // Numbers
  highlighted = highlighted.replace(
    /\b(\d+)\b/g,
    '<span style="color: #bd93f9;">$1</span>'
  );
  
  // Comments (simple)
  highlighted = highlighted.replace(
    /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    '<span style="color: #6272a4;">$1</span>'
  );
  
  // Function/class names (heuristic)
  if (type === 'function' || type === 'class') {
    highlighted = highlighted.replace(
      /\b([A-Z][a-zA-Z0-9]*)\b/g,
      '<span style="color: #8be9fd;">$1</span>'
    );
  }
  
  return highlighted;
}

// Helper function to safely access localStorage
const safeLocalStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }
};

interface ErrorState {
  message: string;
  type: 'search' | 'storage' | 'network' | 'general';
  canRetry: boolean;
}

export default function DeepContextPanel({ activeFile, onOpenFile }: DeepContextPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DeepContextSearchResult[]>([]);
  const [relationships, setRelationships] = useState<DeepContextRelationship[]>([]);
  const [status, setStatus] = useState(deepContextService.getStatus());
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [loadingRelationships, setLoadingRelationships] = useState(false);

  // Handle hydration by ensuring we only access localStorage on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load search history and saved queries from localStorage only after mounting
  useEffect(() => {
    if (!mounted) return;
    
    try {
      const history = safeLocalStorage.getItem('deepcontext-history');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
      
      const saved = safeLocalStorage.getItem('deepcontext-saved');
      if (saved) {
        setSavedQueries(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading DeepContext data from localStorage:', error);
    }
  }, [mounted]);
  
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
  const handleSearch = useCallback(async (searchQuery?: string) => {
    const queryToUse = searchQuery || query;
    console.log('DeepContext search triggered:', { 
      query, 
      searchQuery,
      queryToUse,
      queryLength: queryToUse.length, 
      queryTrimmed: queryToUse.trim(), 
      status 
    });
    const trimmedQuery = queryToUse.trim();
    
    if (!trimmedQuery) {
      console.error('Empty query detected:', { query, searchQuery, queryToUse, trimmed: trimmedQuery });
      setError({ message: 'Please enter a search query', type: 'general', canRetry: false });
      return;
    }
    
    setError(null); // Clear previous errors
    setSearching(true);
    
    try {
      // Update query state if searchQuery was provided
      if (searchQuery && searchQuery !== query) {
        setQuery(searchQuery);
      }
      
      // Save to search history
      const newHistory = [queryToUse, ...searchHistory.filter(h => h !== queryToUse)].slice(0, 20);
      setSearchHistory(newHistory);
      safeLocalStorage.setItem('deepcontext-history', JSON.stringify(newHistory));
      
      // Check if DeepContext would be helpful but not installed
      if (!status.installed && deepContextService.wouldBeHelpful(queryToUse)) {
        console.log('DeepContext not installed, showing upgrade prompt');
        setShowUpgradePrompt(true);
      }
      
      console.log('Calling deepContextService.search with query:', queryToUse);
      const searchResults = await deepContextService.search(queryToUse);
      console.log('Search results:', searchResults);
      
      if (!searchResults || searchResults.length === 0) {
        setError({ 
          message: 'No results found. Try different search terms or check if the files exist.',
          type: 'search',
          canRetry: true
        });
        setResults([]);
      } else {
        setResults(searchResults);
      }
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError({
        message: `Search failed: ${errorMessage}`,
        type: 'network',
        canRetry: true
      });
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query, status.installed, searchHistory]);
  
  // Save query handler
  const handleSaveQuery = useCallback((queryToSave: string = query) => {
    const newSaved: SavedQuery = {
      query: queryToSave,
      timestamp: Date.now(),
      label: queryToSave
    };
    const updated = [newSaved, ...savedQueries.filter(s => s.query !== queryToSave)].slice(0, 10);
    setSavedQueries(updated);
    safeLocalStorage.setItem('deepcontext-saved', JSON.stringify(updated));
  }, [query, savedQueries]);
  
  // Handle clicking on a result to open file
  const handleResultClick = useCallback((result: DeepContextSearchResult) => {
    if (onOpenFile) {
      onOpenFile(result.file, result.line);
    }
  }, [onOpenFile]);

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
                    Click to add Advanced File Search for FREE
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
            <h3 className="text-lg font-semibold">📁 File Search is indexing your codebase...</h3>
            <p className="text-sm text-text-secondary">Scanning files for searchable content</p>
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

  // Main File Search interface
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
            onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
            placeholder="Search for files or code..."
            className="w-full pl-10 pr-24 py-2 bg-bg-tertiary border border-border-default rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:border-purple-400 transition-colors"
          />
          
          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 disabled:bg-gray-500/20 disabled:cursor-not-allowed text-purple-300 disabled:text-gray-500 text-xs rounded border border-purple-500/40 disabled:border-gray-500/40 transition-colors"
          >
            {searching ? '...' : 'Search'}
          </button>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && (
              <button
                onClick={() => handleSaveQuery()}
                className="text-text-muted hover:text-yellow-400 transition-colors"
                title="Save query"
              >
                <Star className="w-4 h-4" />
              </button>
            )}
            {searchHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-text-muted hover:text-text-primary transition-colors"
                title="Search history"
              >
                <Clock className="w-4 h-4" />
              </button>
            )}
            {status.indexed && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                AI
              </span>
            )}
          </div>
        </div>
        
        {/* History/Saved Queries Dropdown */}
        {showHistory && (searchHistory.length > 0 || savedQueries.length > 0) && (
          <div className="absolute z-10 mt-1 w-full bg-bg-secondary border border-border-default rounded-lg shadow-lg max-h-64 overflow-auto">
            {savedQueries.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-semibold text-text-muted">Saved Queries</div>
                {savedQueries.map((saved, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setShowHistory(false);
                      handleSearch(saved.query);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary flex items-center justify-between group"
                  >
                    <span className="text-yellow-400 mr-2">★</span>
                    <span className="flex-1">{saved.label}</span>
                    <X
                      className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = savedQueries.filter((_, idx) => idx !== i);
                        setSavedQueries(updated);
                        safeLocalStorage.setItem('deepcontext-saved', JSON.stringify(updated));
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
            {searchHistory.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-semibold text-text-muted">Recent Searches</div>
                {searchHistory.slice(0, 5).map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setShowHistory(false);
                      handleSearch(item);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
                  <div 
                    key={i} 
                    onClick={() => onOpenFile?.(rel.file, rel.line)}
                    className="flex items-center gap-2 text-xs hover:bg-bg-secondary rounded px-2 py-1 cursor-pointer transition-colors"
                  >
                    <span className="text-text-muted">•</span>
                    <span className="text-purple-400">{rel.type}:</span>
                    <span className="text-text-secondary hover:text-text-primary">{rel.file}</span>
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
              Search Results ({results.length})
            </h3>
            {results.map((result, i) => (
              <div 
                key={i} 
                onClick={() => handleResultClick(result)}
                className="bg-bg-tertiary rounded-lg p-3 hover:bg-bg-secondary transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium text-purple-400 group-hover:text-purple-300">
                    {result.file}
                  </span>
                  <span className="text-xs text-text-muted">Line {result.line}</span>
                </div>
                <pre className="text-xs text-text-secondary font-mono overflow-hidden whitespace-pre-wrap">
                  <code dangerouslySetInnerHTML={{ __html: highlightCode(result.content, result.type) }} />
                </pre>
                {result.context && (
                  <p className="text-xs text-text-muted mt-2">{result.context}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mx-4 mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-red-400 mt-0.5">
                {error.type === 'network' ? '🌐' : error.type === 'search' ? '🔍' : '⚠️'}
              </div>
              <div className="flex-1">
                <p className="text-sm text-red-300 font-medium">{error.message}</p>
                {error.canRetry && (
                  <button 
                    onClick={() => {
                      setError(null);
                      if (error.type === 'search') {
                        handleSearch();
                      }
                    }}
                    className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded border border-red-500/40 transition-colors"
                  >
                    Try Again
                  </button>
                )}
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 transition-colors text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {searching && (
          <div className="mx-4 mb-4 p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
                <Sparkles className="w-4 h-4 text-purple-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <p className="text-sm text-purple-300 font-medium">Searching your codebase...</p>
                <p className="text-xs text-purple-400/80">Using AI to find relevant code patterns</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading Relationships */}
        {loadingRelationships && (
          <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
              <p className="text-sm text-blue-300">Analyzing file relationships...</p>
            </div>
          </div>
        )}

        {/* No Results State - When search returns 0 results */}
        {results.length === 0 && !searching && query.length > 0 && (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="space-y-3">
              <SearchX className="w-12 h-12 text-yellow-400 mx-auto opacity-50" />
              <p className="text-sm text-text-secondary">
                No results found for "{query}"
              </p>
              <div className="text-xs text-text-muted space-y-1">
                <p>Try a different search term</p>
                <p>Or search for file types: ".ts", ".js", ".tsx"</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State - Initial state with no search */}
        {!activeFile && results.length === 0 && !searching && query.length === 0 && (
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