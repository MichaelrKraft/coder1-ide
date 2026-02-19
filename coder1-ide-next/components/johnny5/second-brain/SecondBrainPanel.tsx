'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, RefreshCw, AlertCircle, Clock } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Fact {
  type: 'personal' | 'preference' | 'project' | 'technical' | 'goal';
  key: string;
  value: string;
  confidence: number;
  // Fields present when using getRelevantFactsRanked (default + search paths)
  created_at?: string;
  last_referenced?: string;
  reference_count?: number;
  isStale?: boolean;
  score?: number;
}

type FactType = Fact['type'] | 'all';

const TYPE_LABELS: Record<FactType, string> = {
  all: 'All',
  personal: 'Personal',
  preference: 'Preference',
  project: 'Project',
  technical: 'Technical',
  goal: 'Goal',
};

const FILTER_TYPES: FactType[] = ['all', 'personal', 'preference', 'project', 'technical', 'goal'];

// ============================================================================
// Helpers
// ============================================================================

function confidenceColor(c: number): string {
  if (c >= 0.9) return 'bg-green-500/20 text-green-400';
  if (c >= 0.7) return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-red-500/20 text-red-400';
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function isStaleCheck(fact: Fact): boolean {
  if (fact.isStale !== undefined) return fact.isStale;
  if (!fact.created_at) return false;
  const days = (Date.now() - new Date(fact.created_at).getTime()) / 86400000;
  return days > 90 && fact.confidence < 0.7;
}

// ============================================================================
// Component
// ============================================================================

export default function SecondBrainPanel() {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<FactType>('all');
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchFacts = useCallback(async (q: string, type: FactType) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (q.trim()) params.set('q', q.trim());
      else if (type !== 'all') params.set('type', type);

      const res = await fetch(`/api/johnny5/facts?${params.toString()}`);
      const json = await res.json() as { success: boolean; data?: { facts: Fact[] }; error?: string };

      if (!json.success || !json.data) {
        setError(json.error ?? 'Failed to load facts');
        setFacts([]);
      } else {
        // If type filter is active but q is also provided, filter client-side
        const rawFacts = json.data.facts;
        const filtered = (q.trim() && type !== 'all')
          ? rawFacts.filter(f => f.type === type)
          : rawFacts;
        setFacts(filtered);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setFacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void fetchFacts('', 'all');
  }, [fetchFacts]);

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleSearch = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchFacts(value, activeType), 300);
  };

  const handleTypeChange = (type: FactType) => {
    setActiveType(type);
    void fetchFacts(query, type);
  };

  const handleRetry = () => void fetchFacts(query, activeType);

  return (
    <div className="flex flex-col h-full bg-bg-primary text-text-primary overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-border-subtle space-y-2">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search what Johnny5 knows..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg-secondary border border-border-subtle rounded-md focus:outline-none focus:border-coder1-cyan placeholder:text-text-muted"
          />
        </div>

        {/* Type filter pills */}
        <div className="flex gap-1 flex-wrap">
          {FILTER_TYPES.map(type => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                activeType === type
                  ? 'bg-coder1-cyan text-black font-medium'
                  : 'bg-bg-secondary text-text-muted hover:text-text-primary hover:bg-bg-secondary/80'
              }`}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-4 h-4 text-text-muted animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-xs text-text-muted">{error}</p>
            <button
              onClick={handleRetry}
              className="text-xs text-coder1-cyan hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && facts.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-xs text-text-muted">
              {query
                ? `No facts matching "${query}"`
                : 'No facts captured yet. Start a conversation and Johnny5 will learn from it.'}
            </p>
          </div>
        )}

        {/* Fact cards */}
        {!loading && !error && facts.map((fact, i) => {
          const stale = isStaleCheck(fact);
          return (
            <div
              key={`${fact.key}-${i}`}
              className="p-2.5 bg-bg-secondary border border-border-subtle rounded-md space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-text-primary leading-tight">
                  {fact.key.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {stale && (
                    <span className="flex items-center gap-0.5 text-xs text-yellow-500" title="May be outdated">
                      <Clock className="w-3 h-3" />
                    </span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${confidenceColor(fact.confidence)}`}>
                    {Math.round(fact.confidence * 100)}%
                  </span>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-snug">{fact.value}</p>

              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  fact.type === 'personal' ? 'bg-blue-500/10 text-blue-400' :
                  fact.type === 'preference' ? 'bg-purple-500/10 text-purple-400' :
                  fact.type === 'project' ? 'bg-orange-500/10 text-orange-400' :
                  fact.type === 'technical' ? 'bg-green-500/10 text-green-400' :
                  'bg-pink-500/10 text-pink-400'
                }`}>
                  {fact.type}
                </span>
                {fact.reference_count !== undefined && fact.reference_count > 0 && (
                  <span>{fact.reference_count}× referenced</span>
                )}
                {fact.created_at && (
                  <span>{relativeTime(fact.created_at)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer count */}
      {!loading && !error && facts.length > 0 && (
        <div className="flex-shrink-0 px-3 py-2 border-t border-border-subtle">
          <p className="text-xs text-text-muted">{facts.length} fact{facts.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}
