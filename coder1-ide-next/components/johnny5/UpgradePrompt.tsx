'use client';

import React from 'react';
import { Zap, Sparkles, ExternalLink, Crown } from 'lucide-react';

interface UpgradePromptProps {
  tierType: 'gemini_trial' | 'claude_trial';
  messageCount: number;
  limit: number;
  upgradeUrl: string;
  onDismiss?: () => void;
}

/**
 * UpgradePrompt Component
 *
 * Shows inline upgrade prompts when users hit their Johnny5 message limits.
 * Two variants:
 * - gemini_trial: Free users who need Claude Code Pro/Max
 * - claude_trial: Claude users who need Coder1 Pro ($29/mo)
 */
export default function UpgradePrompt({
  tierType,
  messageCount,
  limit,
  upgradeUrl,
  onDismiss,
}: UpgradePromptProps) {
  const isGeminiTrial = tierType === 'gemini_trial';

  return (
    <div className="bg-gradient-to-r from-purple-500/10 via-coder1-cyan/10 to-purple-500/10 border border-coder1-cyan/30 rounded-xl p-4 my-4">
      {/* Header with icon */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coder1-cyan/20 to-purple-500/20 flex items-center justify-center border border-coder1-cyan/30 flex-shrink-0">
          {isGeminiTrial ? (
            <Sparkles className="w-5 h-5 text-coder1-cyan" />
          ) : (
            <Crown className="w-5 h-5 text-yellow-400" />
          )}
        </div>

        <div className="flex-1">
          {/* Title */}
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            {isGeminiTrial
              ? "You've used all 50 trial messages!"
              : "You're loving Johnny5!"}
          </h3>

          {/* Description */}
          <p className="text-xs text-text-muted mb-3">
            {isGeminiTrial ? (
              <>
                To continue using Johnny5, you need{' '}
                <span className="text-coder1-cyan font-medium">
                  Claude Code Pro or Max
                </span>
                . Johnny5 works best with Claude&apos;s advanced capabilities.
              </>
            ) : (
              <>
                You&apos;ve used{' '}
                <span className="text-coder1-cyan font-medium">
                  {messageCount}/{limit} free messages
                </span>{' '}
                this month. Upgrade to Coder1 Pro for unlimited Johnny5 access.
              </>
            )}
          </p>

          {/* Progress bar for claude_trial */}
          {!isGeminiTrial && (
            <div className="mb-3">
              <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-coder1-cyan to-purple-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (messageCount / limit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* CTA Button */}
          <a
            href={upgradeUrl}
            target={isGeminiTrial ? '_blank' : '_self'}
            rel={isGeminiTrial ? 'noopener noreferrer' : undefined}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-coder1-cyan to-purple-500 text-bg-primary font-medium text-sm hover:opacity-90 transition-all"
          >
            {isGeminiTrial ? (
              <>
                <ExternalLink className="w-4 h-4" />
                Get Claude Code Pro
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Upgrade to Pro - $19/mo
              </>
            )}
          </a>

          {/* Secondary text */}
          <p className="text-[10px] text-text-muted mt-2">
            {isGeminiTrial ? (
              <>Already have Pro/Max? Connect your Bridge to continue.</>
            ) : (
              <>
                Your Claude subscription handles the AI - we just unlock
                Johnny5!
              </>
            )}
          </p>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-text-muted hover:text-text-secondary text-xs"
          >
            Later
          </button>
        )}
      </div>

      {/* Pro features (for claude_trial) */}
      {!isGeminiTrial && (
        <div className="mt-3 pt-3 border-t border-border-default">
          <div className="flex items-center gap-4 text-[10px] text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 bg-green-400 rounded-full" />
              Unlimited Johnny5
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 bg-green-400 rounded-full" />
              Priority Support
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 bg-green-400 rounded-full" />
              Full Audit Trail
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * QuotaMeter Component
 *
 * Shows current usage as a small inline meter.
 * Displays in chat header or input area.
 */
export function QuotaMeter({
  messageCount,
  limit,
  tierType,
  isProSubscriber,
}: {
  messageCount: number;
  limit: number;
  tierType: 'gemini_trial' | 'claude_trial' | 'pro_unlimited';
  isProSubscriber: boolean;
}) {
  if (isProSubscriber) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-green-400">
        <Crown className="w-3 h-3" />
        <span>Pro</span>
      </div>
    );
  }

  const remaining = limit - messageCount;
  const percentage = (messageCount / limit) * 100;
  const isLow = remaining <= 10;
  const isVeryLow = remaining <= 3;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isVeryLow
                ? 'bg-red-500'
                : isLow
                ? 'bg-yellow-500'
                : 'bg-coder1-cyan'
            }`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
        <span
          className={`text-[10px] ${
            isVeryLow
              ? 'text-red-400'
              : isLow
              ? 'text-yellow-400'
              : 'text-text-muted'
          }`}
        >
          {remaining} left
        </span>
      </div>
    </div>
  );
}
