'use client';

import React, { useState, useEffect } from 'react';
import { Brain, MessageSquare, Clock, RefreshCw, Copy, Search, ChevronDown, ChevronUp, CheckCircle, XCircle, FileText, Zap, X, PlayCircle, StopCircle } from 'lucide-react';

interface Conversation {
  id: string;
  userInput: string;
  claudeReply: string;
  timestamp: string;
  success: number;
  errorType: string | null;
  filesInvolved: string[];
  tokensUsed: number;
}

interface ContextStats {
  isLearning: boolean;
  currentSession: string;
  totalConversations: number;
  totalSessions: number;
  totalPatterns: number;
  successRate: number;
  memoryText: string;
  statusText: string;
  folderName: string;
}

interface ContextInjection {
  hasContext: boolean;
  contextMessage: string;
  summary: string;
  conversationCount: number;
  recentConversations: Array<{
    user: string;
    claude: string;
    timestamp: string;
  }>;
}

export default function ContextMemoryPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<ContextStats | null>(null);
  const [contextInjection, setContextInjection] = useState<ContextInjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInjectionPreview, setShowInjectionPreview] = useState(false);
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'success' | 'error' | 'high-token'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'tokens'>('newest');

  // REMOVED: // REMOVED: console.log('🧠 ContextMemoryPanel rendered');

  const startLearningSession = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/context/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'initialize',
          projectPath: '/Users/michaelkraft/autonomous_vibe_interface' 
        })
      });
      
      if (response.ok) {
        showToast('Learning session started!');
        await loadData();
      } else {
        const error = await response.json();
        showToast(`Failed to start session: ${error.error}`, 'error');
      }
    } catch (error) {
      showToast('Failed to start learning session', 'error');
      console.error('Error starting session:', error);
    } finally {
      setLoading(false);
    }
  };

  const endLearningSession = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/context/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'end_session',
          summary: 'Session ended by user',
          successRating: 0.8
        })
      });
      
      if (response.ok) {
        showToast('Learning session ended!');
        await loadData();
      } else {
        const error = await response.json();
        showToast(`Failed to end session: ${error.error}`, 'error');
      }
    } catch (error) {
      showToast('Failed to end learning session', 'error');
      console.error('Error ending session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load context stats
      const statsResponse = await fetch('/api/context/stats');
      if (statsResponse.ok) {
        const text = await statsResponse.text();
        if (text) {
          try {
            const statsData = JSON.parse(text);
            setStats(statsData);
          } catch (e) {
            console.warn('Failed to parse stats response:', e);
          }
        }
      }

      // Load conversations
      const conversationsResponse = await fetch('/api/context/conversations?limit=10');
      if (conversationsResponse.ok) {
        const text = await conversationsResponse.text();
        if (text) {
          try {
            const conversationsData = JSON.parse(text);
            if (conversationsData.conversations) {
              setConversations(conversationsData.conversations);
            }
          } catch (e) {
            console.warn('Failed to parse conversations response:', e);
          }
        }
      }

      // Load context injection preview
      const injectionResponse = await fetch('/api/context/inject?limit=3');
      if (injectionResponse.ok) {
        const text = await injectionResponse.text();
        if (text) {
          try {
            const injectionData = JSON.parse(text);
            setContextInjection(injectionData);
          } catch (e) {
            console.warn('Failed to parse injection response:', e);
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memory data');
      // logger?.error('Error loading context memory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const copyContextToClipboard = async () => {
    if (contextInjection?.contextMessage) {
      await navigator.clipboard.writeText(contextInjection.contextMessage);
      showToast('Context copied to clipboard!');
    }
  };

  const copyConversationText = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${type} copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity ${
      type === 'error' 
        ? 'bg-red-500 text-white' 
        : 'bg-coder1-cyan text-black'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
  };

  const highlightSearchText = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;
    
    try {
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      return text.replace(regex, '<mark class="bg-yellow-200 text-black px-1 rounded">$1</mark>');
    } catch (error) {
      console.warn('Search highlighting error:', error);
      return text;
    }
  };

  const toggleConversationExpansion = (id: string) => {
    const newExpanded = new Set(expandedConversations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedConversations(newExpanded);
  };

  const filteredAndSortedConversations = conversations
    .filter(conv => {
      // Search filter
      const matchesSearch = !searchTerm || 
        conv.userInput.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.claudeReply.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter  
      let matchesType = true;
      switch (filterType) {
        case 'success':
          matchesType = conv.success === 1;
          break;
        case 'error':
          matchesType = conv.errorType !== null;
          break;
        case 'high-token':
          matchesType = conv.tokensUsed > 1000;
          break;
      }
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'tokens':
          return b.tokensUsed - a.tokensUsed;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-coder1-cyan" />
        <span className="ml-2">Loading memory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-center mb-2">
          <Brain className="w-5 h-5 text-red-400 mr-2" />
          <span className="font-medium text-red-400">Memory System Error</span>
        </div>
        <p className="text-sm text-red-300">{error}</p>
        <button 
          onClick={loadData}
          className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-bg-primary text-text-primary">
      {/* Enhanced Header */}
      <div className="p-3 sm:p-4 lg:p-6 border-b border-border-default bg-gradient-to-r from-bg-primary to-bg-secondary overflow-x-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4 min-w-0">
          <div className="flex items-center min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-coder1-purple/20 rounded-xl flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-coder1-purple" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-text-primary truncate">Context Memory</h2>
              <p className="text-xs sm:text-sm text-text-muted hidden sm:block">AI conversation history and context injection</p>
            </div>
            {stats && (
              <div className="ml-2 sm:ml-4 px-2 sm:px-3 py-1 bg-coder1-purple/10 border border-coder1-purple/30 rounded-full flex-shrink-0">
                <span className="text-xs sm:text-sm font-medium text-coder1-purple whitespace-nowrap">{stats.memoryText}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Session Control Buttons */}
            {stats?.isLearning ? (
              <button
                onClick={endLearningSession}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors group"
                title="End learning session"
              >
                <StopCircle className="w-4 h-4 text-red-400" />
                <span className="text-xs font-medium text-red-400 hidden sm:inline">End Session</span>
              </button>
            ) : (
              <button
                onClick={startLearningSession}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-colors group"
                title="Start learning session"
              >
                <PlayCircle className="w-4 h-4 text-green-400" />
                <span className="text-xs font-medium text-green-400 hidden sm:inline">Start Session</span>
              </button>
            )}
            
            <button
              onClick={loadData}
              className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors group"
              title="Refresh memory"
            >
              <RefreshCw className="w-5 h-5 text-text-muted group-hover:text-coder1-purple transition-colors" />
            </button>
          </div>
        </div>
        
        {/* Enhanced Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 lg:gap-3">
            <div className="bg-bg-primary/50 backdrop-blur-sm p-1.5 sm:p-2 lg:p-3 rounded-lg border border-border-default">
              <div className="flex flex-col">
                <div className="text-text-muted text-[10px] sm:text-xs lg:text-sm font-medium truncate">Sessions</div>
                <div className="text-sm sm:text-lg lg:text-xl font-bold text-text-primary">{stats.totalSessions}</div>
              </div>
            </div>
            <div className="bg-bg-primary/50 backdrop-blur-sm p-1.5 sm:p-2 lg:p-3 rounded-lg border border-border-default">
              <div className="flex flex-col">
                <div className="text-text-muted text-[10px] sm:text-xs lg:text-sm font-medium truncate">Convs</div>
                <div className="text-sm sm:text-lg lg:text-xl font-bold text-text-primary">{stats.totalConversations}</div>
              </div>
            </div>
            <div className="bg-bg-primary/50 backdrop-blur-sm p-1.5 sm:p-2 lg:p-3 rounded-lg border border-border-default">
              <div className="flex flex-col">
                <div className="text-text-muted text-[10px] sm:text-xs lg:text-sm font-medium truncate">Success</div>
                <div className="text-sm sm:text-lg lg:text-xl font-bold text-green-400">{Math.round(stats.successRate * 100)}%</div>
              </div>
            </div>
            <div className="bg-bg-primary/50 backdrop-blur-sm p-1.5 sm:p-2 lg:p-3 rounded-lg border border-border-default">
              <div className="flex flex-col">
                <div className="text-text-muted text-[10px] sm:text-xs lg:text-sm font-medium truncate">Patterns</div>
                <div className="text-sm sm:text-lg lg:text-xl font-bold text-text-primary">{stats.totalPatterns}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Context Injection Section */}
      {contextInjection && contextInjection.hasContext && (
        <div className="p-3 sm:p-4 border-b border-border-default bg-gradient-to-r from-coder1-purple/5 to-coder1-cyan/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-coder1-purple/10 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-coder1-purple" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-coder1-purple">Context Injection Ready</h3>
                <p className="text-xs text-text-muted">AI context prepared for Claude Code sessions</p>
              </div>
            </div>
            <button
              onClick={() => setShowInjectionPreview(!showInjectionPreview)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                showInjectionPreview 
                  ? 'bg-coder1-purple text-white shadow-sm' 
                  : 'bg-bg-secondary text-text-muted hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              {showInjectionPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>
          
          {/* Context Summary */}
          <div className="bg-bg-primary/50 backdrop-blur-sm p-3 rounded-lg border border-border-default mb-3">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-coder1-cyan" />
              <span className="text-sm font-medium text-text-primary">Context Summary</span>
            </div>
            <p className="text-sm text-text-secondary">{contextInjection.summary}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
              <span>{contextInjection.conversationCount} conversations included</span>
              <span>•</span>
              <span>{contextInjection.contextMessage.length} characters</span>
            </div>
          </div>
          
          {/* Enhanced Context Preview */}
          {showInjectionPreview && (
            <div className="bg-bg-tertiary border border-border-default rounded-lg overflow-hidden mb-3">
              <div className="px-3 py-2 bg-bg-secondary/50 border-b border-border-default">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-primary">Context Preview</span>
                  <span className="text-xs text-text-muted">
                    {Math.ceil(contextInjection.contextMessage.length / 4)} tokens (approx.)
                  </span>
                </div>
              </div>
              <div className="p-3 max-h-48 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap text-text-secondary font-mono">
                  {contextInjection.contextMessage}
                </pre>
              </div>
            </div>
          )}
          
          {/* Recent Conversations Preview */}
          {contextInjection.recentConversations.length > 0 && (
            <div className="bg-bg-primary/50 backdrop-blur-sm p-3 rounded-lg border border-border-default mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-coder1-cyan" />
                <span className="text-sm font-medium text-text-primary">Recent Conversations</span>
              </div>
              <div className="space-y-2">
                {contextInjection.recentConversations.slice(0, 2).map((conv, index) => (
                  <div key={index} className="text-xs">
                    <div className="text-text-muted mb-1">
                      {new Date(conv.timestamp).toLocaleString()}
                    </div>
                    <div className="text-text-secondary">
                      <span className="font-medium">User:</span> {conv.user.substring(0, 50)}
                      {conv.user.length > 50 && '...'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Enhanced Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={copyContextToClipboard}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-coder1-purple hover:bg-coder1-purple/80 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow"
            >
              <Copy className="w-4 h-4" />
              Copy Context for Claude
            </button>
            <button
              onClick={() => {
                const contextData = {
                  summary: contextInjection.summary,
                  message: contextInjection.contextMessage,
                  conversations: contextInjection.recentConversations,
                  timestamp: new Date().toISOString()
                };
                copyConversationText(JSON.stringify(contextData, null, 2), 'Context data (JSON)');
              }}
              className="px-3 py-2 bg-bg-secondary hover:bg-bg-tertiary text-text-primary rounded-lg text-sm font-medium transition-colors border border-border-default"
              title="Copy as JSON data"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowInjectionPreview(!showInjectionPreview)}
              className="px-3 py-2 bg-bg-secondary hover:bg-bg-tertiary text-text-primary rounded-lg text-sm font-medium transition-colors border border-border-default"
              title="Toggle preview"
            >
              {showInjectionPreview ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Search and Advanced Filters */}
      <div className="p-3 sm:p-4 border-b border-border-default space-y-3 sm:space-y-4">
        {/* Search Input with Clear Button */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search conversations, files, or errors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 bg-bg-tertiary border border-border-default rounded-lg text-sm focus:border-coder1-cyan focus:outline-none text-text-primary transition-all duration-200 focus:shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 w-4 h-4 text-text-muted hover:text-text-primary transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Quick Filter Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-text-muted">Quick filters:</span>
          {[
            { key: 'all', label: 'All', count: conversations.length },
            { key: 'success', label: 'Success', count: conversations.filter(c => c.success === 1).length },
            { key: 'error', label: 'Errors', count: conversations.filter(c => c.errorType !== null).length },
            { key: 'high-token', label: '1000+ tokens', count: conversations.filter(c => c.tokensUsed > 1000).length }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilterType(key as any)}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                filterType === key
                  ? 'bg-coder1-cyan text-black shadow-sm'
                  : 'bg-bg-secondary text-text-muted hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              {label} {count > 0 && `(${count})`}
            </button>
          ))}
        </div>
        
        {/* Advanced Controls Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs px-2 py-1.5 bg-bg-tertiary border border-border-default rounded-lg text-text-primary focus:border-coder1-cyan focus:outline-none transition-colors"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="tokens">Most tokens</option>
              </select>
            </div>
            
            {/* Results Info */}
            <div className="text-xs text-text-muted bg-bg-tertiary px-2 py-1 rounded border border-border-default">
              {filteredAndSortedConversations.length} of {conversations.length} conversations
            </div>
          </div>
          
          {/* Clear All Filters */}
          {(searchTerm || filterType !== 'all' || sortBy !== 'newest') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setSortBy('newest');
              }}
              className="text-xs text-coder1-cyan hover:text-coder1-cyan-secondary font-medium transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
        
        {/* Search Results Summary */}
        {searchTerm && (
          <div className="text-xs text-text-muted bg-coder1-cyan/5 border border-coder1-cyan/20 rounded-lg p-2">
            {filteredAndSortedConversations.length > 0 ? (
              <>Found {filteredAndSortedConversations.length} conversation{filteredAndSortedConversations.length !== 1 ? 's' : ''} matching "{searchTerm}"</>
            ) : (
              <>No conversations found matching "{searchTerm}". Try different keywords or clear filters.</>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Conversations List */}
      <div>
        {filteredAndSortedConversations.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <h3 className="font-medium mb-1">No Conversations Found</h3>
            <p className="text-sm">
              {searchTerm ? 'Try adjusting your search terms or filters' : 'Start a conversation to see it here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4 pb-8">
            {filteredAndSortedConversations.map((conv) => {
              const isExpanded = expandedConversations.has(conv.id);
              return (
                <div 
                  key={conv.id} 
                  className="bg-bg-primary border border-border-default rounded-xl overflow-hidden hover:border-border-focus transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-border-default bg-bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center text-sm text-text-muted">
                          <Clock className="w-4 h-4 mr-2" />
                          {new Date(conv.timestamp).toLocaleString()}
                        </div>
                        {conv.tokensUsed > 0 && (
                          <div className="flex items-center text-sm text-text-muted">
                            <span className="w-2 h-2 bg-coder1-cyan rounded-full mr-2"></span>
                            {conv.tokensUsed.toLocaleString()} tokens
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Status Indicators */}
                        {conv.success === 1 ? (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-xs font-medium text-green-400">Success</span>
                          </div>
                        ) : conv.errorType ? (
                          <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <XCircle className="w-3 h-3 text-red-400" />
                            <span className="text-xs font-medium text-red-400">{conv.errorType}</span>
                          </div>
                        ) : (
                          <div className="w-2 h-2 bg-yellow-400 rounded-full opacity-50"></div>
                        )}
                        
                        {/* Expand/Collapse Button */}
                        <button
                          onClick={() => toggleConversationExpansion(conv.id)}
                          className="p-1 hover:bg-bg-tertiary rounded transition-colors"
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-text-muted" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-text-muted" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-4 space-y-4">
                    {/* User Input */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-coder1-purple/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-coder1-purple">U</span>
                          </div>
                          <span className="text-sm font-medium text-text-primary">User Input</span>
                        </div>
                        <button
                          onClick={() => copyConversationText(conv.userInput, 'User input')}
                          className="p-1 hover:bg-bg-tertiary rounded transition-colors opacity-60 hover:opacity-100"
                          title="Copy user input"
                        >
                          <Copy className="w-3 h-3 text-text-muted" />
                        </button>
                      </div>
                      <div className="ml-8 text-sm text-text-primary bg-bg-secondary/20 p-3 rounded-lg border-l-2 border-coder1-purple/30">
                        <div 
                          className="whitespace-pre-wrap break-words"
                          dangerouslySetInnerHTML={{ 
                            __html: highlightSearchText(conv.userInput || '', searchTerm) 
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Claude Response */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-coder1-cyan/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-coder1-cyan">C</span>
                          </div>
                          <span className="text-sm font-medium text-text-primary">Claude Response</span>
                        </div>
                        <button
                          onClick={() => copyConversationText(conv.claudeReply, 'Claude response')}
                          className="p-1 hover:bg-bg-tertiary rounded transition-colors opacity-60 hover:opacity-100"
                          title="Copy Claude response"
                        >
                          <Copy className="w-3 h-3 text-text-muted" />
                        </button>
                      </div>
                      <div className="ml-8 text-sm text-text-secondary bg-bg-secondary/20 p-3 rounded-lg border-l-2 border-coder1-cyan/30">
                        {isExpanded ? (
                          <div 
                            className="whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ 
                              __html: highlightSearchText(conv.claudeReply || '', searchTerm) 
                            }}
                          />
                        ) : (
                          <div>
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: highlightSearchText(
                                  (conv.claudeReply || '').length > 200 
                                    ? `${(conv.claudeReply || '').substring(0, 200)}...` 
                                    : (conv.claudeReply || ''),
                                  searchTerm
                                ) 
                              }}
                            />
                            {(conv.claudeReply || '').length > 200 && (
                              <button
                                onClick={() => toggleConversationExpansion(conv.id)}
                                className="ml-2 text-coder1-cyan hover:text-coder1-cyan-secondary text-xs font-medium"
                              >
                                Show more
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Files Involved (if any) */}
                    {conv.filesInvolved.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border-default">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-text-muted" />
                            <span className="text-sm font-medium text-text-secondary">
                              Files Involved ({conv.filesInvolved.length})
                            </span>
                          </div>
                          <button
                            onClick={() => copyConversationText(conv.filesInvolved.join('\n'), 'File list')}
                            className="p-1 hover:bg-bg-tertiary rounded transition-colors opacity-60 hover:opacity-100"
                            title="Copy file list"
                          >
                            <Copy className="w-3 h-3 text-text-muted" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {conv.filesInvolved.map((file, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-bg-tertiary border border-border-default rounded text-xs text-text-muted font-mono hover:bg-bg-secondary transition-colors"
                              dangerouslySetInnerHTML={{ 
                                __html: highlightSearchText(file || '', searchTerm) 
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Enhanced Actions Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border-default/50">
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span>{conv.tokensUsed.toLocaleString()} tokens</span>
                        <span>•</span>
                        <span>{new Date(conv.timestamp).toLocaleDateString()}</span>
                        {conv.success === 1 && (
                          <>
                            <span>•</span>
                            <span className="text-green-400">Successful</span>
                          </>
                        )}
                      </div>
                      
                      <button
                        onClick={() => {
                          const fullConversation = `User: ${conv.userInput}\n\nClaude: ${conv.claudeReply}${
                            conv.filesInvolved.length > 0 ? `\n\nFiles: ${conv.filesInvolved.join(', ')}` : ''
                          }`;
                          copyConversationText(fullConversation, 'Full conversation');
                        }}
                        className="text-xs text-coder1-cyan hover:text-coder1-cyan-secondary font-medium transition-colors"
                      >
                        Copy All
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}