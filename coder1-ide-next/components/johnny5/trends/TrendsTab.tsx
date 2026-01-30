'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Settings,
  Filter,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
  Plus,
  X,
  Check,
  Search,
  Zap,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';
import TrendAlert from './TrendAlert';
import TrendSource, { getSourceConfig } from './TrendSource';
import type { Johnny5TrendAlert, Johnny5TrendMonitorConfig } from '@/types/johnny5';

interface TrendsTabProps {
  className?: string;
}

type SourceFilter = Johnny5TrendAlert['source'] | 'all';
type RelevanceFilter = Johnny5TrendAlert['relevance'] | 'all';

/**
 * TrendsTab Component
 *
 * Main trends view for Johnny5 dashboard.
 * Displays trend alerts from X, GitHub, HackerNews, and competitor monitoring.
 *
 * Features:
 * - Filter by source (X, GitHub, HN, Competitor, Custom)
 * - Filter by relevance (High, Medium, Low)
 * - Show/hide dismissed alerts
 * - Configuration panel for monitored topics
 * - Stats summary
 */
export default function TrendsTab({ className = '' }: TrendsTabProps) {
  // State
  const [alerts, setAlerts] = useState<Johnny5TrendAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [relevanceFilter, setRelevanceFilter] = useState<RelevanceFilter>('all');
  const [showDismissed, setShowDismissed] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<Johnny5TrendMonitorConfig | null>(null);
  const [newTopic, setNewTopic] = useState('');
  const [newTopicType, setNewTopicType] = useState<keyof Johnny5TrendMonitorConfig>('xKeywords');

  // Fetch alerts on mount
  useEffect(() => {
    fetchAlerts();
    fetchConfig();
  }, []);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/johnny5/trends/alerts');
      const data = await res.json();
      if (data.success && data.data?.items) {
        setAlerts(data.data.items);
      }
    } catch (error) {
      console.error('[TrendsTab] Failed to fetch alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/johnny5/trends');
      const data = await res.json();
      if (data.success && data.data?.config) {
        setConfig(data.data.config);
      }
    } catch (error) {
      console.error('[TrendsTab] Failed to fetch config:', error);
    }
  };

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    let result = [...alerts];

    if (sourceFilter !== 'all') {
      result = result.filter((a) => a.source === sourceFilter);
    }

    if (relevanceFilter !== 'all') {
      result = result.filter((a) => a.relevance === relevanceFilter);
    }

    if (!showDismissed) {
      result = result.filter((a) => !a.dismissed);
    }

    return result;
  }, [alerts, sourceFilter, relevanceFilter, showDismissed]);

  // Stats
  const stats = useMemo(() => {
    const active = alerts.filter((a) => !a.dismissed);
    return {
      total: alerts.length,
      active: active.length,
      high: active.filter((a) => a.relevance === 'high').length,
      sources: {
        x: active.filter((a) => a.source === 'x').length,
        github: active.filter((a) => a.source === 'github').length,
        hackernews: active.filter((a) => a.source === 'hackernews').length,
        competitor: active.filter((a) => a.source === 'competitor').length,
        custom: active.filter((a) => a.source === 'custom').length,
      },
    };
  }, [alerts]);

  // Handlers
  const handleBuild = async (alert: Johnny5TrendAlert) => {
    console.log('[TrendsTab] Build triggered for:', alert.title);
    // In real implementation, would create a task in Mission Control
    handleDismiss(alert);
  };

  const handleResearch = async (alert: Johnny5TrendAlert) => {
    console.log('[TrendsTab] Research triggered for:', alert.title);
    // In real implementation, would queue research task
  };

  const handleDismiss = async (alert: Johnny5TrendAlert) => {
    try {
      const res = await fetch('/api/johnny5/trends/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: alert.id, action: 'dismiss' }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? { ...a, dismissed: true } : a))
        );
      }
    } catch (error) {
      console.error('[TrendsTab] Failed to dismiss alert:', error);
    }
  };

  const handleSnooze = async (alert: Johnny5TrendAlert) => {
    console.log('[TrendsTab] Snooze triggered for:', alert.title);
    handleDismiss(alert);
  };

  const handleAddTopic = async () => {
    if (!newTopic.trim()) return;

    try {
      const res = await fetch('/api/johnny5/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newTopicType, value: newTopic.trim() }),
      });
      if (res.ok) {
        setNewTopic('');
        fetchConfig();
      }
    } catch (error) {
      console.error('[TrendsTab] Failed to add topic:', error);
    }
  };

  const handleRefresh = () => {
    fetchAlerts();
  };

  const sources: SourceFilter[] = ['all', 'x', 'github', 'hackernews', 'competitor', 'custom'];
  const relevances: RelevanceFilter[] = ['all', 'high', 'medium', 'low'];

  return (
    <div className={`h-full overflow-auto p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-coder1-cyan" />
          <h2 className="text-base font-bold text-text-primary">Trend Monitor</h2>
          {stats.high > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 rounded animate-pulse">
              {stats.high} HIGH
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-md bg-bg-tertiary hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-all disabled:opacity-50"
            title="Refresh trends"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`
              p-1.5 rounded-md transition-all
              ${showConfig
                ? 'bg-coder1-cyan/20 text-coder1-cyan'
                : 'bg-bg-tertiary hover:bg-bg-secondary text-text-muted hover:text-text-primary'
              }
            `}
            title="Configure monitoring"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-coder1-cyan">{stats.active}</div>
            <div className="text-[10px] text-text-muted">Active</div>
          </div>
          <div className="w-px h-8 bg-border-default" />
          <div className="flex items-center gap-2">
            {(['x', 'github', 'hackernews', 'competitor'] as const).map((source) => {
              const sourceConfig = getSourceConfig(source);
              const count = stats.sources[source];
              return (
                <div
                  key={source}
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded-md
                    ${count > 0 ? sourceConfig.bgColor : 'bg-bg-secondary opacity-50'}
                  `}
                  title={`${sourceConfig.label}: ${count}`}
                >
                  <TrendSource source={source} size="sm" />
                  <span className={`text-xs font-medium ${count > 0 ? sourceConfig.textColor : 'text-text-muted'}`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-bg-tertiary rounded-xl p-4 space-y-4 border border-coder1-cyan/20">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-coder1-cyan" />
            <h3 className="text-sm font-semibold text-text-primary">Monitoring Configuration</h3>
          </div>

          {/* Add new topic */}
          <div className="flex items-center gap-2">
            <select
              value={newTopicType}
              onChange={(e) => setNewTopicType(e.target.value as keyof Johnny5TrendMonitorConfig)}
              className="px-2 py-1.5 rounded-md bg-bg-secondary border border-border-default text-xs text-text-primary focus:outline-none focus:border-coder1-cyan"
            >
              <option value="xAccounts">X Accounts</option>
              <option value="xKeywords">X Keywords</option>
              <option value="githubRepos">GitHub Repos</option>
              <option value="hackerNewsKeywords">HN Keywords</option>
              <option value="competitorWebsites">Competitors</option>
            </select>
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Add topic..."
              className="flex-1 px-3 py-1.5 rounded-md bg-bg-secondary border border-border-default text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-coder1-cyan"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
            />
            <button
              onClick={handleAddTopic}
              disabled={!newTopic.trim()}
              className="p-1.5 rounded-md bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30 disabled:opacity-50 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Current monitored topics */}
          {config && (
            <div className="space-y-3">
              {Object.entries(config).map(([key, values]) => {
                if (!Array.isArray(values) || values.length === 0) return null;
                const label = getConfigLabel(key as keyof Johnny5TrendMonitorConfig);
                return (
                  <div key={key}>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                      {label}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {values.slice(0, 5).map((value) => (
                        <span
                          key={value}
                          className="px-2 py-0.5 text-[10px] bg-bg-secondary text-text-secondary rounded-full"
                        >
                          {value}
                        </span>
                      ))}
                      {values.length > 5 && (
                        <span className="px-2 py-0.5 text-[10px] text-text-muted">
                          +{values.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">Source:</span>
          <div className="flex items-center gap-1">
            {sources.map((source) => (
              <button
                key={source}
                onClick={() => setSourceFilter(source)}
                className={`
                  px-2 py-1 rounded-md text-[10px] font-medium transition-all
                  ${sourceFilter === source
                    ? 'bg-coder1-cyan/20 text-coder1-cyan'
                    : 'bg-bg-tertiary text-text-muted hover:bg-bg-secondary hover:text-text-primary'
                  }
                `}
              >
                {source === 'all' ? 'All' : source.charAt(0).toUpperCase() + source.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-4 bg-border-default" />

        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">Relevance:</span>
          <div className="flex items-center gap-1">
            {relevances.map((rel) => (
              <button
                key={rel}
                onClick={() => setRelevanceFilter(rel)}
                className={`
                  px-2 py-1 rounded-md text-[10px] font-medium transition-all
                  ${relevanceFilter === rel
                    ? 'bg-coder1-cyan/20 text-coder1-cyan'
                    : 'bg-bg-tertiary text-text-muted hover:bg-bg-secondary hover:text-text-primary'
                  }
                `}
              >
                {rel.charAt(0).toUpperCase() + rel.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-4 bg-border-default" />

        <button
          onClick={() => setShowDismissed(!showDismissed)}
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all
            ${showDismissed
              ? 'bg-orange-500/20 text-orange-400'
              : 'bg-bg-tertiary text-text-muted hover:bg-bg-secondary hover:text-text-primary'
            }
          `}
        >
          {showDismissed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {showDismissed ? 'Showing dismissed' : 'Show dismissed'}
        </button>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-coder1-cyan animate-spin" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp className="w-10 h-10 text-text-muted mb-3" />
          <p className="text-sm text-text-secondary">No trends matching filters</p>
          <p className="text-xs text-text-muted mt-1">
            Try adjusting your filters or wait for new alerts
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <TrendAlert
              key={alert.id}
              alert={alert}
              onBuild={handleBuild}
              onResearch={handleResearch}
              onDismiss={handleDismiss}
              onSnooze={handleSnooze}
            />
          ))}
        </div>
      )}

      {/* Info Footer */}
      <div className="flex items-start gap-2 p-3 bg-bg-tertiary rounded-xl mt-4">
        <Info className="w-4 h-4 text-coder1-cyan flex-shrink-0 mt-0.5" />
        <div className="text-xs text-text-secondary">
          <p className="font-medium text-text-primary mb-1">About Trend Monitor</p>
          <p>
            Johnny5 continuously monitors X, GitHub, HackerNews, and competitor websites for
            opportunities. When a relevant trend is detected, you can choose to build a feature,
            research further, or dismiss it.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getConfigLabel(key: keyof Johnny5TrendMonitorConfig): string {
  switch (key) {
    case 'xAccounts':
      return 'X Accounts';
    case 'xKeywords':
      return 'X Keywords';
    case 'githubRepos':
      return 'GitHub Repos';
    case 'hackerNewsKeywords':
      return 'HN Keywords';
    case 'competitorWebsites':
      return 'Competitors';
    case 'industryNewsRss':
      return 'RSS Feeds';
    case 'customWebhooks':
      return 'Webhooks';
    default:
      return key;
  }
}
