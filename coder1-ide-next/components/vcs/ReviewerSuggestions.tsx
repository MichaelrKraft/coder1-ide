'use client';

import React, { useState } from 'react';
import { UserPlus, Loader2, Check, AlertCircle } from 'lucide-react';

interface ReviewerSuggestion {
  githubLogin: string;
  reason: string;
  score: number;
}

interface ReviewerSuggestionsProps {
  prOwner: string;
  prRepo: string;
  prNumber: number;
  suggestions: ReviewerSuggestion[];
  loading?: boolean;
  onRequestReview: (login: string) => Promise<void>;
}

export default function ReviewerSuggestions({
  prOwner,
  prRepo,
  prNumber,
  suggestions,
  loading = false,
  onRequestReview,
}: ReviewerSuggestionsProps) {
  const [requestingLogin, setRequestingLogin] = useState<string | null>(null);
  const [requestedLogins, setRequestedLogins] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleRequestReview = async (login: string) => {
    setRequestingLogin(login);
    setError(null);
    try {
      await onRequestReview(login);
      setRequestedLogins(prev => new Set([...prev, login]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request review');
    } finally {
      setRequestingLogin(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Finding reviewers...</span>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <h5 className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
        Suggested Reviewers
      </h5>

      {error && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-400/10 rounded px-2 py-1">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1">
        {suggestions.slice(0, 5).map(suggestion => {
          const isRequested = requestedLogins.has(suggestion.githubLogin);
          const isRequesting = requestingLogin === suggestion.githubLogin;

          return (
            <div
              key={suggestion.githubLogin}
              className="flex items-center justify-between gap-2 bg-bg-secondary rounded px-2 py-1.5"
            >
              <div className="min-w-0">
                <span className="text-xs text-coder1-cyan font-medium">
                  {suggestion.githubLogin}
                </span>
                <p className="text-[10px] text-text-muted truncate">
                  {suggestion.reason}
                </p>
              </div>
              <button
                onClick={() => handleRequestReview(suggestion.githubLogin)}
                disabled={isRequested || isRequesting}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors flex-shrink-0 ${
                  isRequested
                    ? 'bg-green-500/10 text-green-400 cursor-default'
                    : 'bg-coder1-cyan/10 text-coder1-cyan hover:bg-coder1-cyan/20 disabled:opacity-50'
                }`}
                aria-label={`Request review from ${suggestion.githubLogin}`}
              >
                {isRequesting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isRequested ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <UserPlus className="w-3 h-3" />
                )}
                {isRequested ? 'Requested' : 'Request'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
