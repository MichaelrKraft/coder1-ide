'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  History,
  Loader2,
  SlidersHorizontal,
  X,
  ChevronDown,
} from 'lucide-react';
import { useJohnny5Store } from '@/stores/useJohnny5Store';
import SessionCard from './SessionCard';
import SessionDetail from './SessionDetail';
import type { Johnny5SessionSummary } from '@/types';

type StatusFilter = 'all' | 'active' | 'completed' | 'error';
type SortOption = 'newest' | 'oldest' | 'most-tokens' | 'most-tools';

/**
 * SessionsTab - Main sessions list view for Johnny5 AI Employee Dashboard
 *
 * Features:
 * - Search sessions by name
 * - Filter by status (all/active/completed/error)
 * - Sort options (newest/oldest/most-tokens/most-tools)
 * - Session cards with key metrics
 * - Expandable session detail view
 * - Loading and empty states
 * - Animated background gradient orbs
 */
export default function SessionsTab() {
  const {
    sessions,
    sessionsLoading,
    selectedSessionId,
    searchQuery,
    setSearchQuery,
    selectSession,
    setSessions,
    setSessionsLoading,
    setActiveTab,
  } = useJohnny5Store();

  // Ensure sessions is always an array (Zustand persist can hydrate with unexpected types)
  const sessionsArray = Array.isArray(sessions) ? sessions : [];

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      setSessionsLoading(true);
      try {
        const response = await fetch('/api/johnny5/sessions');
        if (response.ok) {
          const data = await response.json();
          // API returns paginated response: { success, data: { items, total, page, pageSize, hasMore } }
          const sessions = data.data?.items || data.data || [];
          setSessions(sessions);
        } else {
          // Use mock data for development
          setSessions(getMockSessions());
        }
      } catch {
        // Use mock data for development
        setSessions(getMockSessions());
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchSessions();
  }, [setSessions, setSessionsLoading]);

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let result = [...sessionsArray];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (session) =>
          session.name.toLowerCase().includes(query) ||
          session.filesModified.some((f) => f.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((session) => session.status === statusFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        break;
      case 'most-tokens':
        result.sort((a, b) => b.tokensUsed - a.tokensUsed);
        break;
      case 'most-tools':
        result.sort((a, b) => b.toolCalls - a.toolCalls);
        break;
    }

    return result;
  }, [sessionsArray, searchQuery, statusFilter, sortBy]);

  // Handle session selection
  const handleSelectSession = useCallback(
    (sessionId: string) => {
      selectSession(selectedSessionId === sessionId ? null : sessionId);
    },
    [selectedSessionId, selectSession]
  );

  // Handle close detail view
  const handleCloseDetail = useCallback(() => {
    selectSession(null);
  }, [selectSession]);

  // Handle start replay
  const handleStartReplay = useCallback(
    (sessionId: string) => {
      selectSession(sessionId);
      setActiveTab('reasoning');
    },
    [selectSession, setActiveTab]
  );

  // Handle refresh
  const handleRefresh = async () => {
    setSessionsLoading(true);
    try {
      const response = await fetch('/api/johnny5/sessions');
      if (response.ok) {
        const data = await response.json();
        // API returns paginated response: { success, data: { items, total, page, pageSize, hasMore } }
        const sessions = data.data?.items || data.data || [];
        setSessions(sessions);
      }
    } catch {
      // Keep existing data on error
    } finally {
      setSessionsLoading(false);
    }
  };

  // Get status filter counts
  const statusCounts = useMemo(() => {
    return {
      all: sessionsArray.length,
      active: sessionsArray.filter((s) => s.status === 'active').length,
      completed: sessionsArray.filter((s) => s.status === 'completed').length,
      error: sessionsArray.filter((s) => s.status === 'error').length,
    };
  }, [sessionsArray]);

  // If a session is selected, show the detail view
  if (selectedSessionId) {
    return (
      <SessionDetail
        sessionId={selectedSessionId}
        onClose={handleCloseDetail}
        onStartReplay={handleStartReplay}
      />
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Animated Background Gradient Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient Orb 1 - Cyan */}
        <div
          className="absolute w-48 h-48 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(0, 217, 255, 0.4), transparent)',
            top: '-60px',
            right: '-60px',
            filter: 'blur(50px)',
            animation: 'sessionsFloat 18s ease-in-out infinite',
          }}
        />

        {/* Gradient Orb 2 - Purple */}
        <div
          className="absolute w-40 h-40 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent)',
            bottom: '80px',
            left: '-40px',
            filter: 'blur(35px)',
            animation: 'sessionsFloat 14s ease-in-out infinite reverse',
          }}
        />

        {/* Gradient Orb 3 - Orange */}
        <div
          className="absolute w-24 h-24 rounded-full opacity-8"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.25), transparent)',
            top: '40%',
            left: '50%',
            filter: 'blur(25px)',
            animation: 'sessionsPulse 8s ease-in-out infinite',
          }}
        />
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes sessionsFloat {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-12px) translateX(6px);
          }
          50% {
            transform: translateY(6px) translateX(-6px);
          }
          75% {
            transform: translateY(-6px) translateX(3px);
          }
        }

        @keyframes sessionsPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.08;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.12;
          }
        }
      `}</style>

      {/* Header with Search and Filters */}
      <div className="px-3 py-3 border-b border-border-default bg-bg-secondary/80 backdrop-blur-sm relative z-10">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-sm bg-bg-tertiary border border-border-default rounded-lg
              text-text-primary placeholder-text-muted
              focus:outline-none focus:border-coder1-cyan/50 focus:ring-1 focus:ring-coder1-cyan/30
              transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded
                text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex items-center justify-between mt-2 gap-2">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {(['all', 'active', 'completed', 'error'] as StatusFilter[]).map((status) => {
              const isSelected = statusFilter === status;
              const getStyles = () => {
                if (isSelected) {
                  switch (status) {
                    case 'error':
                      return 'bg-red-500/20 text-red-400 border-red-500/40';
                    case 'active':
                      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
                    case 'completed':
                      return 'bg-green-500/20 text-green-400 border-green-500/40';
                    default:
                      return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
                  }
                }
                return 'bg-zinc-800/80 text-zinc-400 border-zinc-600/50 hover:text-zinc-300 hover:bg-zinc-700/80 hover:border-zinc-500/50';
              };
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all border ${getStyles()}`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="ml-1 opacity-70">({statusCounts[status]})</span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  p-1.5 rounded-md transition-all
                  ${showFilters ? 'bg-coder1-cyan/20 text-coder1-cyan' : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'}
                `}
                title="Sort options"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {/* Sort Dropdown Menu */}
              {showFilters && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-bg-secondary border border-border-default rounded-lg shadow-lg z-20 overflow-hidden">
                  <div className="p-2">
                    <p className="text-xs text-text-muted mb-1 px-2">Sort by</p>
                    {(
                      [
                        { value: 'newest', label: 'Newest First' },
                        { value: 'oldest', label: 'Oldest First' },
                        { value: 'most-tokens', label: 'Most Tokens' },
                        { value: 'most-tools', label: 'Most Tools' },
                      ] as { value: SortOption; label: string }[]
                    ).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setShowFilters(false);
                        }}
                        className={`
                          w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors
                          ${sortBy === option.value ? 'bg-coder1-cyan/20 text-coder1-cyan' : 'text-text-secondary hover:bg-bg-tertiary'}
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={sessionsLoading}
              className="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-all disabled:opacity-50"
              title="Refresh sessions"
            >
              <RefreshCw className={`w-4 h-4 ${sessionsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-auto p-3 space-y-2 relative z-10">
        {sessionsLoading && sessionsArray.length === 0 ? (
          // Loading State
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="w-8 h-8 text-coder1-cyan animate-spin mb-3" />
            <p className="text-sm text-text-muted">Loading sessions...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="w-12 h-12 text-text-muted opacity-50 mb-3" />
            <h4 className="text-sm font-semibold text-text-secondary mb-1">
              {searchQuery || statusFilter !== 'all' ? 'No matching sessions' : 'No sessions yet'}
            </h4>
            <p className="text-xs text-text-muted max-w-xs">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Sessions will appear here as Johnny5 works on tasks'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="mt-3 px-3 py-1.5 text-xs bg-bg-tertiary border border-border-default rounded-md
                  hover:border-coder1-cyan/50 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          // Sessions List
          filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isSelected={selectedSessionId === session.id}
              onSelect={handleSelectSession}
            />
          ))
        )}
      </div>

      {/* Footer Stats */}
      {filteredSessions.length > 0 && (
        <div className="px-3 py-2 border-t border-border-default bg-bg-secondary/80 backdrop-blur-sm relative z-10">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
              {searchQuery || statusFilter !== 'all' ? ' (filtered)' : ''}
            </span>
            <span>
              {filteredSessions.reduce((sum, s) => sum + s.tokensUsed, 0).toLocaleString()} total
              tokens
            </span>
          </div>
        </div>
      )}

      {/* Click outside to close sort dropdown */}
      {showFilters && (
        <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
      )}
    </div>
  );
}

// Mock data generator for development
function getMockSessions(): Johnny5SessionSummary[] {
  const now = Date.now();
  return [
    {
      id: 'session-1',
      name: 'Implementing Johnny5 Sessions Tab',
      startTime: new Date(now - 45 * 60 * 1000),
      endTime: new Date(),
      status: 'completed',
      toolCalls: 12,
      filesModified: ['SessionsTab.tsx', 'SessionCard.tsx', 'SessionDetail.tsx', 'index.ts'],
      tokensUsed: 24567,
      thinkingLevel: 'high',
      duration: 45,
    },
    {
      id: 'session-2',
      name: 'Refactoring Terminal Component',
      startTime: new Date(now - 2 * 60 * 60 * 1000),
      endTime: new Date(now - 90 * 60 * 1000),
      status: 'completed',
      toolCalls: 8,
      filesModified: ['Terminal.tsx', 'Terminal.css'],
      tokensUsed: 15234,
      thinkingLevel: 'medium',
      duration: 30,
    },
    {
      id: 'session-3',
      name: 'Building Morning Brief Feature',
      startTime: new Date(now - 10 * 60 * 1000),
      status: 'active',
      toolCalls: 3,
      filesModified: ['MorningBrief.tsx'],
      tokensUsed: 5678,
      thinkingLevel: 'high',
      duration: 10,
    },
    {
      id: 'session-4',
      name: 'Bug Fix: API Response Handling',
      startTime: new Date(now - 24 * 60 * 60 * 1000),
      endTime: new Date(now - 23 * 60 * 60 * 1000),
      status: 'error',
      toolCalls: 5,
      filesModified: ['api/route.ts'],
      tokensUsed: 8901,
      thinkingLevel: 'low',
      duration: 60,
    },
    {
      id: 'session-5',
      name: 'Adding Security Monitoring',
      startTime: new Date(now - 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(now - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      status: 'completed',
      toolCalls: 22,
      filesModified: [
        'SecurityMonitor.tsx',
        'useSecurityStore.ts',
        'AuditLog.tsx',
        'PromptInjectionAlert.tsx',
      ],
      tokensUsed: 45678,
      thinkingLevel: 'high',
      duration: 120,
    },
  ];
}
