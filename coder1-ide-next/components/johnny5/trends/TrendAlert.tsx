'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Lightbulb,
  Hammer,
  Search,
  X,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import TrendSource from './TrendSource';
import type { Johnny5TrendAlert } from '@/types/johnny5';

interface TrendAlertProps {
  alert: Johnny5TrendAlert;
  onBuild?: (alert: Johnny5TrendAlert) => void;
  onResearch?: (alert: Johnny5TrendAlert) => void;
  onDismiss?: (alert: Johnny5TrendAlert) => void;
  onSnooze?: (alert: Johnny5TrendAlert) => void;
  className?: string;
}

/**
 * TrendAlert Component
 *
 * Individual trend alert card showing detected opportunities.
 *
 * Structure:
 * +---------------------------------------------------------+
 * |  [TrendIcon] Trend Alert                    Just now    |
 * +---------------------------------------------------------+
 * |  [Relevance] [Title]                                    |
 * |  Source: [X/GitHub/HN] | Relevance: HIGH                |
 * |  [Opportunity text]                                     |
 * |  [Build It] [Research More] [Dismiss] [Snooze]          |
 * +---------------------------------------------------------+
 */
export default function TrendAlert({
  alert,
  onBuild,
  onResearch,
  onDismiss,
  onSnooze,
  className = '',
}: TrendAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const relevanceConfig = getRelevanceConfig(alert.relevance);
  const formattedTime = formatRelativeTime(alert.timestamp);

  const handleOpenUrl = () => {
    if (alert.url) {
      window.open(alert.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`
        group relative rounded-xl border overflow-hidden
        bg-bg-tertiary hover:bg-bg-float
        transition-all duration-200
        ${alert.relevance === 'high'
          ? 'border-coder1-cyan/30 shadow-[0_0_15px_rgba(0,217,255,0.1)]'
          : 'border-border-default hover:border-coder1-cyan/30'
        }
        ${alert.dismissed ? 'opacity-60' : ''}
        ${className}
      `}
    >
      {/* High relevance glow effect */}
      {alert.relevance === 'high' && !alert.dismissed && (
        <div className="absolute inset-0 bg-gradient-to-r from-coder1-cyan/5 via-transparent to-coder1-cyan/5 pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border-default/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-coder1-cyan" />
          <span className="text-xs font-semibold text-text-secondary">
            Trend Alert
          </span>
        </div>
        <span className="text-[10px] text-text-muted">{formattedTime}</span>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Title Row */}
        <div className="flex items-start gap-2">
          <span
            className={`
              flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase
              ${relevanceConfig.bgColor} ${relevanceConfig.textColor}
              ${alert.relevance === 'high' ? 'animate-pulse' : ''}
            `}
          >
            {alert.relevance}
          </span>
          <h4
            className="text-sm font-semibold text-text-primary leading-tight cursor-pointer hover:text-coder1-cyan transition-colors"
            onClick={handleOpenUrl}
          >
            {alert.title}
          </h4>
        </div>

        {/* Source and Relevance */}
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <span>Source:</span>
            <TrendSource source={alert.source} size="sm" showLabel />
          </div>
          <span className="text-border-default">|</span>
          <div className="flex items-center gap-1.5">
            <span>Relevance:</span>
            <span className={`font-medium ${relevanceConfig.textColor}`}>
              {alert.relevance.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Description (expandable) */}
        <div>
          <p
            className={`
              text-xs text-text-secondary
              ${isExpanded ? '' : 'line-clamp-2'}
            `}
          >
            {alert.description}
          </p>
          {alert.description.length > 100 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 mt-1 text-[10px] text-coder1-cyan hover:text-coder1-cyan/80 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show more
                </>
              )}
            </button>
          )}
        </div>

        {/* Opportunity */}
        {alert.opportunity && (
          <div
            className={`
              flex items-start gap-2 p-2.5 rounded-lg
              bg-yellow-500/10 border border-yellow-500/20
            `}
          >
            <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider">
                Opportunity
              </span>
              <p className="text-xs text-text-secondary mt-0.5">
                {alert.opportunity}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!alert.dismissed && (
          <div className="flex flex-wrap gap-2 pt-2">
            {onBuild && (
              <button
                onClick={() => onBuild(alert)}
                className="
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-coder1-cyan/20 text-coder1-cyan
                  hover:bg-coder1-cyan/30 hover:shadow-[0_0_10px_rgba(0,217,255,0.2)]
                  transition-all duration-200
                "
              >
                <Hammer className="w-3.5 h-3.5" />
                Build It
              </button>
            )}
            {onResearch && (
              <button
                onClick={() => onResearch(alert)}
                className="
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-blue-500/20 text-blue-400
                  hover:bg-blue-500/30
                  transition-all duration-200
                "
              >
                <Search className="w-3.5 h-3.5" />
                Research
              </button>
            )}
            {onDismiss && (
              <button
                onClick={() => onDismiss(alert)}
                className="
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-bg-secondary text-text-muted
                  hover:bg-red-500/20 hover:text-red-400
                  transition-all duration-200
                "
              >
                <X className="w-3.5 h-3.5" />
                Dismiss
              </button>
            )}
            {onSnooze && (
              <button
                onClick={() => onSnooze(alert)}
                className="
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-bg-secondary text-text-muted
                  hover:bg-orange-500/20 hover:text-orange-400
                  transition-all duration-200
                "
              >
                <Clock className="w-3.5 h-3.5" />
                Snooze
              </button>
            )}
            {alert.url && (
              <button
                onClick={handleOpenUrl}
                className="
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-bg-secondary text-text-muted
                  hover:bg-purple-500/20 hover:text-purple-400
                  transition-all duration-200 ml-auto
                "
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cyan glow line on hover */}
      <div
        className={`
          absolute bottom-0 left-2 right-2 h-0.5 rounded-full
          transition-opacity duration-200
          bg-gradient-to-r from-transparent via-coder1-cyan to-transparent
          ${alert.relevance === 'high' ? 'opacity-50' : 'opacity-0 group-hover:opacity-30'}
        `}
      />
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

interface RelevanceConfig {
  bgColor: string;
  textColor: string;
  borderColor: string;
}

function getRelevanceConfig(relevance: Johnny5TrendAlert['relevance']): RelevanceConfig {
  switch (relevance) {
    case 'high':
      return {
        bgColor: 'bg-red-500/20',
        textColor: 'text-red-400',
        borderColor: 'border-red-500/40',
      };
    case 'medium':
      return {
        bgColor: 'bg-yellow-500/20',
        textColor: 'text-yellow-400',
        borderColor: 'border-yellow-500/40',
      };
    case 'low':
    default:
      return {
        bgColor: 'bg-gray-500/20',
        textColor: 'text-gray-400',
        borderColor: 'border-gray-500/40',
      };
  }
}

function formatRelativeTime(timestamp: Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}
