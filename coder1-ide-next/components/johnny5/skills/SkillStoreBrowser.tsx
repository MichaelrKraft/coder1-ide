'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Download,
  Store,
  Loader2,
  CheckCircle,
  Shield,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  Info,
  X,
  ChevronDown,
  Package,
} from 'lucide-react';
import type {
  ClawHubSkillSummary,
  SkillCompatibility,
  SkillSecurityFinding,
} from '@/types/johnny5';

// ================================================================================
// Types
// ================================================================================

interface SkillStoreBrowserProps {
  onInstalled?: () => void;
}

type SecurityScore = 'safe' | 'warning' | 'dangerous';

interface SecurityModalState {
  open: boolean;
  slug: string;
  score: SecurityScore;
  findings: SkillSecurityFinding[];
  installing: boolean;
}

// ================================================================================
// Helpers
// ================================================================================

function getCompatibility(_skill: ClawHubSkillSummary): SkillCompatibility {
  // With only summary data available, we default to 'high'.
  // A future version can inspect tags/metadata for env var or binary requirements.
  return 'high';
}

function compatibilityBadge(level: SkillCompatibility) {
  switch (level) {
    case 'high':
      return {
        label: 'Compatible',
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        border: 'border-green-500/40',
      };
    case 'medium':
      return {
        label: 'May need setup',
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/40',
      };
    case 'low':
      return {
        label: 'Limited',
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/40',
      };
  }
}

function severityBadge(severity: SkillSecurityFinding['severity']) {
  switch (severity) {
    case 'info':
      return {
        icon: <Info className="w-3.5 h-3.5" />,
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        border: 'border-blue-500/40',
        label: 'Info',
      };
    case 'warning':
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/40',
        label: 'Warning',
      };
    case 'danger':
      return {
        icon: <ShieldX className="w-3.5 h-3.5" />,
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/40',
        label: 'Danger',
      };
  }
}

const SEARCH_LIMIT = 12;
const DEBOUNCE_MS = 300;

// ================================================================================
// Component
// ================================================================================

export default function SkillStoreBrowser({ onInstalled }: SkillStoreBrowserProps) {
  // --- Search state ---
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClawHubSkillSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  // --- Install state ---
  const [installedSlugs, setInstalledSlugs] = useState<Set<string>>(new Set());
  const [installingSlugs, setInstallingSlugs] = useState<Set<string>>(new Set());
  const [securityModal, setSecurityModal] = useState<SecurityModalState>({
    open: false,
    slug: '',
    score: 'safe',
    findings: [],
    installing: false,
  });

  // --- Debounce ref ---
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Fetch installed skills on mount ---
  useEffect(() => {
    const fetchInstalledSkills = async () => {
      try {
        const res = await fetch('/api/johnny5/skills');
        if (res.ok) {
          const json = await res.json();
          const skills = json.data || [];
          // Extract clawhubSlug from installed ClawHub skills
          const slugs = skills
            .filter((s: { source?: string; clawhubSlug?: string }) => s.source === 'clawhub' && s.clawhubSlug)
            .map((s: { clawhubSlug: string }) => s.clawhubSlug);
          setInstalledSlugs(new Set(slugs));
        }
      } catch (err) {
        console.error('[SkillStore] Failed to fetch installed skills:', err);
      }
    };
    fetchInstalledSkills();
  }, []);

  // --- Search API ---
  const searchSkills = useCallback(async (searchQuery: string, nextCursor?: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasMore(false);
      setCursor(undefined);
      setError(null);
      return;
    }

    const isLoadMore = !!nextCursor;
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        limit: String(SEARCH_LIMIT),
      });
      if (nextCursor) {
        params.set('cursor', nextCursor);
      }

      const res = await fetch(`/api/johnny5/skills/clawhub?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }

      const json = await res.json();
      // API returns Johnny5APIResponse: { success, data: { results, hasMore, cursor }, timestamp }
      const payload = json.data || json;
      const newResults: ClawHubSkillSummary[] = payload.results || [];

      if (isLoadMore) {
        setResults((prev) => [...prev, ...newResults]);
      } else {
        setResults(newResults);
      }

      setHasMore(!!payload.hasMore);
      setCursor(payload.cursor || undefined);
    } catch (err) {
      console.error('[SkillStore] Search error:', err);
      setError('Failed to search skills. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // --- Debounced search on query change ---
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setHasMore(false);
      setCursor(undefined);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchSkills(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchSkills]);

  // --- Load more ---
  const loadMore = useCallback(() => {
    if (cursor && !loadingMore) {
      searchSkills(query, cursor);
    }
  }, [cursor, loadingMore, query, searchSkills]);

  // --- Install skill ---
  const installSkill = useCallback(async (slug: string, force?: boolean) => {
    setInstallingSlugs((prev) => new Set(prev).add(slug));

    try {
      const body: { slug: string; force?: boolean } = { slug };
      if (force) {
        body.force = true;
      }

      const res = await fetch('/api/johnny5/skills/clawhub/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        // Blocked (dangerous)
        if (data.securityReport?.score === 'dangerous') {
          setSecurityModal({
            open: true,
            slug,
            score: 'dangerous',
            findings: data.securityReport.findings || [],
            installing: false,
          });
          return;
        }
        throw new Error(data.error || 'Install failed');
      }

      // Requires force (warning)
      if (data.requiresForce && data.securityReport?.score === 'warning') {
        setSecurityModal({
          open: true,
          slug,
          score: 'warning',
          findings: data.securityReport.findings || [],
          installing: false,
        });
        return;
      }

      // Success
      setInstalledSlugs((prev) => new Set(prev).add(slug));
      onInstalled?.();
    } catch (err) {
      console.error('[SkillStore] Install error:', err);
      setError(`Failed to install "${slug}". Please try again.`);
    } finally {
      setInstallingSlugs((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }
  }, [onInstalled]);

  // --- Force install from modal ---
  const handleForceInstall = useCallback(async () => {
    const { slug } = securityModal;
    setSecurityModal((prev) => ({ ...prev, installing: true }));

    try {
      const res = await fetch('/api/johnny5/skills/clawhub/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, force: true }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setInstalledSlugs((prev) => new Set(prev).add(slug));
        setSecurityModal((prev) => ({ ...prev, open: false }));
        onInstalled?.();
      } else {
        throw new Error(data.error || 'Install failed');
      }
    } catch (err) {
      console.error('[SkillStore] Force install error:', err);
      setError(`Failed to install "${slug}". Please try again.`);
      setSecurityModal((prev) => ({ ...prev, open: false }));
    }
  }, [securityModal, onInstalled]);

  // --- Close security modal ---
  const closeSecurityModal = useCallback(() => {
    setSecurityModal((prev) => ({ ...prev, open: false }));
  }, []);

  // --- Determine current state for rendering ---
  const hasQuery = query.trim().length > 0;
  const showInitial = !hasQuery && results.length === 0 && !loading;
  const showNoResults = hasQuery && results.length === 0 && !loading && !error;
  const showError = !!error && !loading;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative z-10">
      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search community skills..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border-default rounded-lg
              text-sm text-text-primary placeholder-text-muted
              focus:border-coder1-cyan focus:outline-none"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Initial empty state */}
        {showInitial && (
          <div className="text-center py-12">
            <Store className="w-12 h-12 mx-auto mb-3 text-text-muted opacity-50" />
            <p className="text-sm text-text-secondary">
              Search for community skills to extend Johnny5&apos;s capabilities
            </p>
          </div>
        )}

        {/* No results */}
        {showNoResults && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto mb-3 text-text-muted opacity-50" />
            <p className="text-sm text-text-secondary">
              No skills found for &apos;{query}&apos;
            </p>
          </div>
        )}

        {/* Error state */}
        {showError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="flex items-center gap-2 text-xs text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </p>
          </div>
        )}

        {/* Results list */}
        {!loading && results.length > 0 && (
          <>
            {results.map((skill) => (
              <StoreSkillCard
                key={skill.slug}
                skill={skill}
                compatibility={getCompatibility(skill)}
                installed={installedSlugs.has(skill.slug)}
                installing={installingSlugs.has(skill.slug)}
                onInstall={() => installSkill(skill.slug)}
              />
            ))}

            {/* Load More */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center justify-center gap-2 w-full py-2.5
                  bg-bg-secondary border border-border-default rounded-lg
                  text-xs font-semibold text-text-secondary
                  hover:border-coder1-cyan/40 hover:text-coder1-cyan transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Load More
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Security Review Modal */}
      {securityModal.open && (
        <SecurityReviewModal
          slug={securityModal.slug}
          score={securityModal.score}
          findings={securityModal.findings}
          installing={securityModal.installing}
          onForceInstall={handleForceInstall}
          onClose={closeSecurityModal}
        />
      )}
    </div>
  );
}

// ================================================================================
// Sub-components
// ================================================================================

/** Skeleton loading card */
function SkeletonCard() {
  return (
    <div className="p-4 rounded-lg border border-border-default bg-bg-secondary animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 bg-bg-tertiary rounded" />
          <div className="h-3 w-full bg-bg-tertiary rounded" />
          <div className="h-3 w-2/3 bg-bg-tertiary rounded" />
        </div>
        <div className="h-8 w-20 bg-bg-tertiary rounded-lg" />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <div className="h-5 w-16 bg-bg-tertiary rounded-full" />
        <div className="h-5 w-12 bg-bg-tertiary rounded-full" />
        <div className="h-5 w-12 bg-bg-tertiary rounded-full" />
      </div>
    </div>
  );
}

/** Individual skill card in the store listing */
function StoreSkillCard({
  skill,
  compatibility,
  installed,
  installing,
  onInstall,
}: {
  skill: ClawHubSkillSummary;
  compatibility: SkillCompatibility;
  installed: boolean;
  installing: boolean;
  onInstall: () => void;
}) {
  const compat = compatibilityBadge(compatibility);

  return (
    <div className="p-4 rounded-lg border border-border-default bg-bg-secondary hover:border-coder1-cyan/40 transition-all duration-200">
      {/* Top row: name + install button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary truncate">
            {skill.displayName}
          </h4>
          <p className="text-xs text-text-muted mt-1 max-h-[60px] overflow-y-auto pr-1 leading-relaxed scrollbar-thin scrollbar-thumb-border-default scrollbar-track-transparent">
            {skill.summary}
          </p>
        </div>

        {/* Install / Installed button */}
        {installed ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/40 rounded-lg text-xs font-semibold shrink-0">
            <CheckCircle className="w-3.5 h-3.5" />
            Installed
          </span>
        ) : (
          <button
            onClick={onInstall}
            disabled={installing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-coder1-cyan/20 text-coder1-cyan
              border border-coder1-cyan/40 rounded-lg text-xs font-semibold
              hover:bg-coder1-cyan/30 transition-all shrink-0
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {installing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Installing
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Install
              </>
            )}
          </button>
        )}
      </div>

      {/* Info row: stats + compatibility */}
      <div className="flex items-center gap-2 flex-wrap mt-3">
        {/* Version */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-muted border border-border-default">
          v{skill.version}
        </span>

        {/* Compatibility */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
            ${compat.bg} ${compat.text} border ${compat.border}`}
        >
          <Shield className="w-3 h-3" />
          {compat.label}
        </span>
      </div>
    </div>
  );
}

/** Security review modal for warning/dangerous scores */
function SecurityReviewModal({
  slug,
  score,
  findings,
  installing,
  onForceInstall,
  onClose,
}: {
  slug: string;
  score: SecurityScore;
  findings: SkillSecurityFinding[];
  installing: boolean;
  onForceInstall: () => void;
  onClose: () => void;
}) {
  const isDangerous = score === 'dangerous';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[80vh] overflow-hidden bg-bg-primary border border-border-default rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <div className="flex items-center gap-2">
            {isDangerous ? (
              <ShieldX className="w-5 h-5 text-red-400" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-yellow-400" />
            )}
            <h2 className="text-lg font-bold text-text-primary">
              Security Review
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-130px)] space-y-4">
          {/* Score banner */}
          <div
            className={`p-3 rounded-lg border ${
              isDangerous
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-yellow-500/10 border-yellow-500/30'
            }`}
          >
            <p className={`text-xs font-semibold ${isDangerous ? 'text-red-400' : 'text-yellow-400'}`}>
              {isDangerous
                ? `"${slug}" has been flagged as dangerous and cannot be installed.`
                : `"${slug}" has security warnings. Review the findings below before installing.`}
            </p>
          </div>

          {/* Findings list */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Findings ({findings.length})
            </h3>
            {findings.map((finding, i) => {
              const badge = severityBadge(finding.severity);
              return (
                <div
                  key={i}
                  className="p-3 bg-bg-secondary border border-border-default rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                        ${badge.bg} ${badge.text} border ${badge.border}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                    <code className="text-[10px] text-text-muted font-mono">
                      {finding.pattern}
                    </code>
                    {finding.line != null && (
                      <span className="text-[10px] text-text-muted">
                        line {finding.line}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {finding.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-default">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary
              bg-bg-secondary border border-border-default rounded-lg hover:bg-bg-tertiary transition-all"
          >
            Close
          </button>
          {!isDangerous && (
            <button
              onClick={onForceInstall}
              disabled={installing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold
                text-yellow-900 bg-yellow-500 rounded-lg hover:bg-yellow-400 transition-all
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {installing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  Install Anyway
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
