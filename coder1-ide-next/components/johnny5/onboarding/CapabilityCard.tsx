'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  Circle,
  ChevronRight,
  Zap,
  Link2,
  Sparkles,
  // Icons for capabilities
  Sunrise,
  Repeat,
  Image,
  Mail,
  Eye,
  TrendingUp,
  Bell,
  FileText,
  GitPullRequest,
  Wand2,
  Calendar,
  Search,
  BarChart,
  Layers,
  Code,
  TestTube2,
  BookOpen,
  LineChart,
  PieChart,
  MessageSquare,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { MatchedCapability } from '@/services/johnny5/capability-matcher';
import { getCategoryMeta } from '@/services/johnny5/capability-matcher';

// Icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
  Sunrise,
  Repeat,
  Image,
  Mail,
  Eye,
  TrendingUp,
  Bell,
  FileText,
  GitPullRequest,
  Wand2,
  Calendar,
  Search,
  BarChart,
  Layers,
  Code,
  TestTube2,
  BookOpen,
  LineChart,
  PieChart,
  MessageSquare,
  Users,
};

interface CapabilityCardProps {
  capability: MatchedCapability;
  onToggle: (id: string, enabled: boolean) => void;
  onConfigure?: (id: string) => void;
  compact?: boolean;
}

/**
 * CapabilityCard - Individual capability suggestion card
 *
 * Shows a matched capability with:
 * - Name and description
 * - Relevance score badge
 * - Enable/disable toggle
 * - Required integrations indicator
 * - Reason why it was suggested
 */
export default function CapabilityCard({
  capability,
  onToggle,
  onConfigure,
  compact = false,
}: CapabilityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const IconComponent = ICON_MAP[capability.icon] || Zap;
  const categoryMeta = getCategoryMeta(capability.category);

  // Color based on relevance score
  const getScoreColor = () => {
    if (capability.relevanceScore >= 85) return 'text-green-400 bg-green-500/20';
    if (capability.relevanceScore >= 70) return 'text-coder1-cyan bg-coder1-cyan/20';
    return 'text-amber-400 bg-amber-500/20';
  };

  // Category color mapping
  const getCategoryColor = () => {
    const colors: Record<string, string> = {
      purple: 'border-purple-500/30 bg-purple-500/10',
      blue: 'border-blue-500/30 bg-blue-500/10',
      amber: 'border-amber-500/30 bg-amber-500/10',
      green: 'border-green-500/30 bg-green-500/10',
      cyan: 'border-coder1-cyan/30 bg-coder1-cyan/10',
      pink: 'border-pink-500/30 bg-pink-500/10',
      orange: 'border-orange-500/30 bg-orange-500/10',
    };
    return colors[categoryMeta.color] || colors.cyan;
  };

  const handleToggle = () => {
    onToggle(capability.id, !capability.enabled);
  };

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        className={`
          w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left
          ${capability.enabled
            ? 'bg-coder1-cyan/10 border-coder1-cyan/50 shadow-[0_0_10px_rgba(0,217,255,0.1)]'
            : 'bg-bg-tertiary border-border-default hover:border-coder1-cyan/30'
          }
        `}
      >
        {/* Toggle */}
        <div className="flex-shrink-0">
          {capability.enabled ? (
            <CheckCircle className="w-5 h-5 text-coder1-cyan" />
          ) : (
            <Circle className="w-5 h-5 text-text-muted" />
          )}
        </div>

        {/* Icon */}
        <div
          className={`
            w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
            ${capability.enabled ? 'bg-coder1-cyan/20' : 'bg-bg-secondary'}
          `}
        >
          <IconComponent
            className={`w-4 h-4 ${
              capability.enabled ? 'text-coder1-cyan' : 'text-text-muted'
            }`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={`text-sm font-semibold truncate ${
              capability.enabled ? 'text-text-primary' : 'text-text-secondary'
            }`}
          >
            {capability.name}
          </h4>
          <p className="text-xs text-text-muted truncate">
            {capability.description}
          </p>
        </div>

        {/* Score */}
        <span
          className={`
            px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0
            ${getScoreColor()}
          `}
        >
          {capability.relevanceScore}%
        </span>
      </button>
    );
  }

  return (
    <div
      className={`
        rounded-xl border transition-all overflow-hidden
        ${capability.enabled
          ? 'bg-coder1-cyan/5 border-coder1-cyan/40 shadow-[0_0_15px_rgba(0,217,255,0.1)]'
          : 'bg-bg-secondary border-border-default hover:border-coder1-cyan/30'
        }
      `}
    >
      {/* Main Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Toggle Button */}
          <button
            onClick={handleToggle}
            className={`
              w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
              transition-all
              ${capability.enabled
                ? 'bg-coder1-cyan text-black'
                : 'bg-bg-tertiary hover:bg-coder1-cyan/20'
              }
            `}
          >
            {capability.enabled ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <IconComponent
                className={`w-5 h-5 ${
                  capability.enabled ? 'text-black' : 'text-text-muted'
                }`}
              />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4
                className={`text-sm font-bold ${
                  capability.enabled ? 'text-text-primary' : 'text-text-secondary'
                }`}
              >
                {capability.name}
              </h4>

              {/* Relevance Score */}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getScoreColor()}`}
              >
                {capability.relevanceScore}% match
              </span>

              {/* Category Badge */}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getCategoryColor()}`}
              >
                {categoryMeta.label}
              </span>
            </div>

            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {capability.description}
            </p>

            {/* Reason */}
            <div className="flex items-center gap-1.5 mt-2">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] text-amber-400/80 italic">
                {capability.reason}
              </span>
            </div>
          </div>
        </div>

        {/* Required Integrations */}
        {capability.requiredIntegrations && capability.requiredIntegrations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border-default">
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs text-text-muted">
                Requires:{' '}
                {capability.requiredIntegrations.map((int, idx) => (
                  <span key={int}>
                    <span className="text-coder1-cyan capitalize">{int}</span>
                    {idx < capability.requiredIntegrations!.length - 1 && ', '}
                  </span>
                ))}
              </span>
            </div>
          </div>
        )}

        {/* Expandable Setup Steps */}
        {capability.setupSteps && capability.setupSteps.length > 0 && (
          <>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 mt-3 text-xs text-coder1-cyan hover:underline"
            >
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
              {isExpanded ? 'Hide setup steps' : 'Show setup steps'}
            </button>

            {isExpanded && (
              <div className="mt-3 pl-4 space-y-2">
                {capability.setupSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-bg-tertiary text-[10px] font-bold text-text-muted flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-text-secondary">{step}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Configure Button (when enabled) */}
      {capability.enabled && onConfigure && (
        <button
          onClick={() => onConfigure(capability.id)}
          className="
            w-full px-4 py-2.5 border-t border-coder1-cyan/30
            bg-coder1-cyan/10 hover:bg-coder1-cyan/20
            text-xs font-semibold text-coder1-cyan
            flex items-center justify-center gap-2
            transition-all
          "
        >
          Configure Settings
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
