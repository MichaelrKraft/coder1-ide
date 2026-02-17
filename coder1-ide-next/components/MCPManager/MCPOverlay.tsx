'use client';

import React, { useEffect, useCallback } from 'react';
import { X, RefreshCw, Boxes, Search, Filter } from 'lucide-react';
import { useMCPManager } from '@/hooks/useMCPManager';

interface MCPOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MCPOverlay({ isOpen, onClose }: MCPOverlayProps) {
  const {
    servers,
    filteredServers,
    tokenUsage,
    isLoadingServers,
    isAnalyzing,
    serversError,
    filterTab,
    searchQuery,
    enabledCount,
    totalTokens,
    toggleServer,
    setFilterTab,
    setSearchQuery,
    refresh,
    analyzeUsage,
  } = useMCPManager();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Load data on open
  useEffect(() => {
    if (isOpen && servers.length === 0) {
      refresh();
    }
    if (isOpen && !tokenUsage) {
      analyzeUsage();
    }
  }, [isOpen, servers.length, tokenUsage, refresh, analyzeUsage]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  console.log('[MCPOverlay] Render called, isOpen:', isOpen);

  if (!isOpen) return null;

  console.log('[MCPOverlay] Rendering overlay content');
  const usagePercentage = tokenUsage?.usagePercentage ?? 0;
  const usageColor = usagePercentage >= 0.8 ? 'text-red-400' : usagePercentage >= 0.6 ? 'text-orange-400' : 'text-green-400';
  const barColor = usagePercentage >= 0.8 ? 'bg-red-500' : usagePercentage >= 0.6 ? 'bg-orange-500' : 'bg-green-500';

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-bg-primary border border-border-default rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <div className="flex items-center gap-3">
            <Boxes className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-text-primary">MCP Servers</h2>
            <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">
              {enabledCount}/{servers.length} enabled
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh()}
              disabled={isLoadingServers}
              className="p-1.5 hover:bg-bg-primary rounded transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-text-muted ${isLoadingServers ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-bg-primary rounded transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </div>

        {/* Token Usage Bar */}
        <div className="px-4 py-3 border-b border-border-default bg-bg-tertiary/30">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-muted">Context Window Usage</span>
            <span className={`text-xs font-medium ${usageColor}`}>
              {isAnalyzing ? 'Analyzing...' : `${Math.round(usagePercentage * 100)}%`}
            </span>
          </div>
          <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all duration-300`}
              style={{ width: `${Math.min(usagePercentage * 100, 100)}%` }}
            />
          </div>
          {tokenUsage && (
            <div className="flex items-center justify-between mt-1.5 text-xs text-text-muted">
              <span>{totalTokens.toLocaleString()} tokens estimated</span>
              <span>{tokenUsage.contextWindowSize.toLocaleString()} max</span>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-3 p-3 border-b border-border-default">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-bg-primary border border-border-default rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div className="flex items-center gap-1 bg-bg-primary rounded border border-border-default p-0.5">
            {(['all', 'enabled', 'disabled'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-2.5 py-1 text-xs rounded transition-colors capitalize ${
                  filterTab === tab
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Server List */}
        <div className="flex-1 overflow-auto p-3">
          {serversError ? (
            <div className="text-center py-8 text-red-400">
              <p>Error loading servers: {serversError}</p>
              <button
                onClick={() => refresh()}
                className="mt-2 text-sm text-orange-400 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : isLoadingServers && servers.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              Loading MCP servers...
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              {searchQuery ? `No servers matching "${searchQuery}"` : 'No servers found'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredServers.map((server) => (
                <ServerCard
                  key={server.name}
                  server={server}
                  onToggle={(enabled) => toggleServer(server.name, enabled)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border-default flex items-center justify-between text-xs text-text-muted">
          <span>Press Esc to close</span>
          <span>
            {filteredServers.length} of {servers.length} servers shown
          </span>
        </div>
      </div>
    </div>
  );
}

// Server Card Component (inline for now, can be extracted later)
interface ServerCardProps {
  server: {
    name: string;
    enabled: boolean;
    category: string;
    description?: string;
    estimatedTokens?: number;
    toolCount?: number;
    status?: string;
  };
  onToggle: (enabled: boolean) => void;
}

function ServerCard({ server, onToggle }: ServerCardProps) {
  const categoryColors: Record<string, string> = {
    filesystem: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    code: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    web: 'bg-green-500/20 text-green-400 border-green-500/30',
    ai: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    database: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    custom: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const statusColors: Record<string, string> = {
    connected: 'bg-green-500',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500',
    unknown: 'bg-yellow-500',
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
      server.enabled
        ? 'bg-bg-tertiary/50 border-border-default'
        : 'bg-bg-primary/30 border-border-default/50 opacity-60'
    }`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full ${statusColors[server.status || 'unknown']}`} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary truncate">{server.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${categoryColors[server.category] || categoryColors.custom}`}>
              {server.category}
            </span>
          </div>
          {server.description && (
            <p className="text-xs text-text-muted truncate mt-0.5">{server.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
            {server.estimatedTokens && (
              <span>~{server.estimatedTokens.toLocaleString()} tokens</span>
            )}
            {server.toolCount && (
              <span>{server.toolCount} tools</span>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Switch */}
      <button
        onClick={() => onToggle(!server.enabled)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          server.enabled ? 'bg-orange-500' : 'bg-bg-tertiary'
        }`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          server.enabled ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  );
}
