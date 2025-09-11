'use client';

import React, { useState, useEffect } from 'react';
import { Brain, MessageSquare, Clock, RefreshCw, Copy, Search } from 'lucide-react';

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

  // REMOVED: // REMOVED: console.log('🧠 ContextMemoryPanel rendered');

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
      alert('Context message copied to clipboard!');
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.userInput.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.claudeReply.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="h-full flex flex-col bg-bg-primary text-text-primary">
      {/* Header */}
      <div className="p-4 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="w-5 h-5 text-coder1-purple mr-2" />
            <h2 className="font-semibold">Context Memory</h2>
            {stats && (
              <span className="ml-2 px-2 py-1 bg-coder1-purple rounded text-xs">
                {stats.memoryText}
              </span>
            )}
          </div>
          <button
            onClick={loadData}
            className="p-1 hover:bg-bg-tertiary rounded"
            title="Refresh memory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        {/* Stats */}
        {stats && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="bg-bg-tertiary p-2 rounded">
              <div className="text-text-muted">Sessions</div>
              <div className="font-semibold">{stats.totalSessions}</div>
            </div>
            <div className="bg-bg-tertiary p-2 rounded">
              <div className="text-text-muted">Conversations</div>
              <div className="font-semibold">{stats.totalConversations}</div>
            </div>
          </div>
        )}
      </div>

      {/* Context Injection Preview */}
      {contextInjection && contextInjection.hasContext && (
        <div className="p-4 border-b border-border-default">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-coder1-purple">Context Injection Ready</h3>
            <button
              onClick={() => setShowInjectionPreview(!showInjectionPreview)}
              className="text-xs text-coder1-purple hover:text-coder1-cyan"
            >
              {showInjectionPreview ? 'Hide' : 'Show'} Preview
            </button>
          </div>
          
          <div className="text-xs text-text-muted mb-2">
            {contextInjection.summary}
          </div>
          
          {showInjectionPreview && (
            <div className="bg-bg-tertiary p-3 rounded mb-2 max-h-32 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap">
                {contextInjection.contextMessage}
              </pre>
            </div>
          )}
          
          <button
            onClick={copyContextToClipboard}
            className="flex items-center px-3 py-1 bg-coder1-purple hover:bg-coder1-cyan rounded text-xs transition-colors"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy Context for Claude
          </button>
        </div>
      )}

      {/* Search */}
      <div className="p-4 border-b border-border-default">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-bg-tertiary border border-border-default rounded text-sm focus:border-coder1-cyan focus:outline-none text-text-primary"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-text-muted">
            <MessageSquare className="w-8 h-8 mx-auto mb-2" />
            {searchTerm ? 'No conversations match your search' : 'No conversations found'}
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {filteredConversations.map((conv) => (
              <div key={conv.id} className="bg-bg-tertiary p-3 rounded-lg hover:bg-bg-secondary border border-border-default transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center text-xs text-text-muted">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(conv.timestamp).toLocaleString()}
                  </div>
                  <div className="flex items-center">
                    {conv.success === 1 && (
                      <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">Success</span>
                    )}
                    {conv.errorType && (
                      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs">{conv.errorType}</span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-text-muted mb-1">User:</div>
                    <div className="text-sm">{conv.userInput}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-text-muted mb-1">Claude:</div>
                    <div className="text-sm text-text-secondary">
                      {conv.claudeReply.length > 200 
                        ? `${conv.claudeReply.substring(0, 200)}...` 
                        : conv.claudeReply
                      }
                    </div>
                  </div>
                </div>
                
                {conv.filesInvolved.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border-default">
                    <div className="text-xs text-text-muted">
                      Files: {conv.filesInvolved.join(', ')}
                    </div>
                  </div>
                )}
                
                <div className="mt-2 text-xs text-text-muted">
                  {conv.tokensUsed} tokens
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}