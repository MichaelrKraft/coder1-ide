/**
 * Context Manager Panel Component
 * Displays Claude's growing memory, allows search and exploration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Brain, Search, X, Clock, CheckCircle, XCircle, FileText, Zap, TrendingUp, Database } from 'lucide-react';
import { logger } from '@/lib/logger';

interface ContextStats {
  totalConversations: number;
  totalSessions: number;
  totalPatterns: number;
  successRate: number;
  isLearning: boolean;
}

interface Conversation {
  id: string;
  userInput: string;
  claudeReply: string;
  timestamp: string;
  success: boolean;
  errorType?: string;
  filesInvolved: string[];
  tokensUsed: number;
  relevanceScore: number;
}

interface SearchResult {
  query: string;
  totalResults: number;
  conversations: Conversation[];
  patterns: any[];
  relevantContext: any;
}

interface ContextManagerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContextManagerPanel: React.FC<ContextManagerPanelProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<ContextStats>({
    totalConversations: 0,
    totalSessions: 0,
    totalPatterns: 0,
    successRate: 0,
    isLearning: false
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'patterns'>('overview');
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load context stats and conversations with real-time updates
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Use the correct context stats endpoint
        const response = await fetch('/api/context/stats');
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalConversations: data.totalConversations || 0,
            totalSessions: data.totalSessions || 0,
            totalPatterns: data.totalPatterns || 0,
            successRate: data.successRate / 100 || 0, // Already a percentage from API
            isLearning: data.isLearning || false
          });
        }
      } catch (error) {
        logger.warn('Could not load context stats:', error);
      }
    };

    const loadConversations = async () => {
      setLoadingConversations(true);
      try {
        const response = await fetch('/api/context/conversations?limit=5');
        if (response.ok) {
          const data = await response.json();
          setRecentConversations(data.conversations || []);
        }
      } catch (error) {
        logger.warn('Could not load conversations:', error);
      } finally {
        setLoadingConversations(false);
      }
    };

    const loadAllData = async () => {
      await Promise.all([loadStats(), loadConversations()]);
      setLastUpdated(new Date());
    };

    if (isOpen) {
      loadAllData(); // Load immediately when opened
      // Update both stats AND conversations every 5 seconds for real-time feel
      const interval = setInterval(loadAllData, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Handle search
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch('/api/context/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          limit: 10,
          includePatterns: true,
          includeConversations: true 
        })
      });

      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        logger.debug(`🔍 Context search results for "${query}":`, results);
      }
    } catch (error) {
      logger.error('Context search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-11 left-0 bg-bg-secondary border border-border-default rounded-tr-lg transition-all duration-300 ease-in-out z-50 shadow-2xl"
         style={{ width: '800px', height: '500px' }}>
      
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
        <div className="flex items-center gap-3">
          <Brain className={`w-5 h-5 ${stats.isLearning ? 'text-cyan-400 animate-pulse' : 'text-cyan-500'}`} />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Context Memory</h3>
            <p className="text-xs text-text-muted">Claude's growing intelligence</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-bg-primary rounded transition-colors"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border-default bg-bg-tertiary">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-bg-secondary'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Overview
          </div>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'search'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-bg-secondary'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search Memory
          </div>
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'patterns'
              ? 'text-cyan-400 border-b-2 border-cyan-400 bg-bg-secondary'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Patterns
          </div>
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Real-time Status */}
            {lastUpdated && (
              <div className="flex items-center justify-between text-xs text-text-muted bg-bg-tertiary rounded-lg p-2 border border-border-default">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span>Live updates every 5 seconds</span>
                </div>
                <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
            
            {/* Memory Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg-tertiary rounded-lg p-4 border border-border-default">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  <span className="font-semibold text-text-primary">Conversations</span>
                  {stats.isLearning && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-400">Live</span>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-cyan-400">{stats.totalConversations}</div>
                <div className="text-xs text-text-muted">
                  {stats.isLearning ? 'Actively learning from terminal' : 'Total memories stored'}
                </div>
              </div>
              
              <div className="bg-bg-tertiary rounded-lg p-4 border border-border-default">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="font-semibold text-text-primary">Success Rate</span>
                </div>
                <div className="text-2xl font-bold text-green-400">{Math.round(stats.successRate * 100)}%</div>
                <div className="text-xs text-text-muted">Successful interactions</div>
              </div>
              
              <div className="bg-bg-tertiary rounded-lg p-4 border border-border-default">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-orange-400" />
                  <span className="font-semibold text-text-primary">Sessions</span>
                </div>
                <div className="text-2xl font-bold text-orange-400">{stats.totalSessions}</div>
                <div className="text-xs text-text-muted">Coding sessions tracked</div>
              </div>
              
              <div className="bg-bg-tertiary rounded-lg p-4 border border-border-default">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold text-text-primary">Patterns</span>
                </div>
                <div className="text-2xl font-bold text-purple-400">{stats.totalPatterns}</div>
                <div className="text-xs text-text-muted">Learned patterns</div>
              </div>
            </div>

            {/* Learning Status */}
            <div className="bg-bg-tertiary rounded-lg p-4 border border-border-default">
              <h4 className="font-semibold text-text-primary mb-2">Learning Status</h4>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${stats.isLearning ? 'bg-cyan-400 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-text-secondary">
                  {stats.isLearning ? 'Claude is actively learning from your conversation' : 'No active learning session'}
                </span>
              </div>
              <div className="mt-2 text-xs text-text-muted">
                Every conversation helps Claude understand your coding patterns and preferences
              </div>
            </div>

            {/* Recent Memories */}
            <div className="bg-bg-tertiary rounded-lg p-4 border border-border-default">
              <h4 className="font-semibold text-text-primary mb-3">Recent Memories</h4>
              {loadingConversations ? (
                <div className="text-center py-4">
                  <div className="text-sm text-text-muted">Loading memories...</div>
                </div>
              ) : recentConversations.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {recentConversations.map((conv) => (
                    <div key={conv.id} className="bg-bg-primary rounded-lg p-3 border border-border-default">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {conv.success ? (
                            <CheckCircle className="w-3 h-3 text-green-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-400" />
                          )}
                          <span className="text-xs text-text-muted">{formatTimestamp(conv.timestamp)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-cyan-400 font-medium mb-1">You asked:</div>
                          <div className="text-xs text-text-primary line-clamp-2">{conv.userInput}</div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-purple-400 font-medium mb-1">Claude replied:</div>
                          <div className="text-xs text-text-secondary line-clamp-3">
                            {conv.claudeReply.substring(0, 200)}{conv.claudeReply.length > 200 ? '...' : ''}
                          </div>
                        </div>
                        
                        {conv.filesInvolved && conv.filesInvolved.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <FileText className="w-3 h-3 text-text-muted" />
                            <span className="text-xs text-text-muted">
                              {conv.filesInvolved.length} file{conv.filesInvolved.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Brain className="w-6 h-6 mx-auto mb-2 text-text-muted opacity-50" />
                  <div className="text-sm text-text-muted">No memories yet</div>
                  <div className="text-xs text-text-muted mt-1">Start a conversation to build Claude's memory</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-4">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Claude's memory... (e.g., 'TypeScript error', 'React hooks')"
                  className="w-full pl-9 pr-4 py-2 bg-bg-tertiary border border-border-default rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 text-white rounded-lg transition-colors"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Search Results */}
            {searchResults && (
              <div className="space-y-3">
                <div className="text-sm text-text-muted">
                  Found {searchResults.totalResults} results for "{searchResults.query}"
                </div>
                
                {searchResults.conversations.map((conv) => (
                  <div key={conv.id} className="bg-bg-tertiary rounded-lg p-4 border border-border-default">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {conv.success ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-xs text-text-muted">{formatTimestamp(conv.timestamp)}</span>
                      </div>
                      {conv.errorType && (
                        <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                          {conv.errorType}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-text-muted font-medium mb-1">User:</div>
                        <div className="text-sm text-text-primary">{conv.userInput}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-text-muted font-medium mb-1">Claude:</div>
                        <div className="text-sm text-text-secondary">{conv.claudeReply}</div>
                      </div>
                      
                      {conv.filesInvolved.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <FileText className="w-3 h-3 text-text-muted" />
                          <span className="text-xs text-text-muted">
                            Files: {conv.filesInvolved.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults && searchResults.conversations.length === 0 && (
              <div className="text-center py-8 text-text-muted">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div>No memories found for "{searchResults.query}"</div>
                <div className="text-xs mt-1">Try different search terms or ask Claude something new!</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="space-y-4">
            <div className="text-center py-8 text-text-muted">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div>Pattern analysis coming soon</div>
              <div className="text-xs mt-1">Claude is learning your coding patterns in the background</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextManagerPanel;