'use client';

import React from 'react';
import {
  Hammer,
  Search,
  TrendingUp,
  AlertCircle,
  GitPullRequest,
  FileText,
  Mail,
  MessageSquare,
  Globe,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { Johnny5BriefItem } from '@/types/johnny5';

interface BriefItemProps {
  item: Johnny5BriefItem;
  type: 'built' | 'research' | 'trend' | 'attention';
  onAction?: (item: Johnny5BriefItem) => void;
}

/**
 * BriefItem - Individual item within a Morning Brief section
 *
 * Displays:
 * - Icon based on type
 * - Title and description
 * - Priority indicator
 * - Action button (View PR, Read Report, etc.)
 */
export default function BriefItem({ item, type, onAction }: BriefItemProps) {
  const iconConfig = getIconConfig(type, item);
  const priorityConfig = getPriorityConfig(item.priority);

  const handleAction = () => {
    if (item.link) {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    }
    onAction?.(item);
  };

  return (
    <div
      className={`
        group relative p-3 pl-4 rounded-lg transition-all duration-200
        bg-transparent hover:bg-white/[0.02]
        border-l-2 border-l-transparent hover:border-l-coder1-cyan/50
      `}
    >
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div
          className={`
            flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center
            ${iconConfig.bgColor}
          `}
        >
          <iconConfig.icon className={`w-3.5 h-3.5 ${iconConfig.textColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title Row */}
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-medium text-text-primary truncate group-hover:text-coder1-cyan transition-colors">
              {item.title}
            </h4>
            {item.priority !== 'low' && (
              <span
                className={`
                  flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
                  ${priorityConfig.bgColor} ${priorityConfig.textColor}
                `}
              >
                {item.priority}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-text-muted line-clamp-2 mb-2">
            {item.description}
          </p>

          {/* Action Button */}
          {item.actionable && item.action && (
            <button
              onClick={handleAction}
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold
                transition-all
                ${type === 'attention'
                  ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                  : 'bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30'
                }
              `}
            >
              {item.action}
              {item.link ? (
                <ExternalLink className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getIconConfig(
  type: 'built' | 'research' | 'trend' | 'attention',
  item: Johnny5BriefItem
): {
  icon: typeof Hammer;
  bgColor: string;
  textColor: string;
} {
  // Check for special cases based on content
  const title = item.title.toLowerCase();
  const link = item.link?.toLowerCase() || '';

  if (link.includes('github.com/') && link.includes('/pull/')) {
    return {
      icon: GitPullRequest,
      bgColor: 'bg-purple-500/20',
      textColor: 'text-purple-400',
    };
  }

  if (link.includes('github.com/') || title.includes('github')) {
    return {
      icon: Globe,
      bgColor: 'bg-gray-500/20',
      textColor: 'text-gray-400',
    };
  }

  if (title.includes('email') || title.includes('mail')) {
    return {
      icon: Mail,
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400',
    };
  }

  if (title.includes('slack') || title.includes('discord') || title.includes('message')) {
    return {
      icon: MessageSquare,
      bgColor: 'bg-violet-500/20',
      textColor: 'text-violet-400',
    };
  }

  if (title.includes('report') || title.includes('analysis') || title.includes('doc')) {
    return {
      icon: FileText,
      bgColor: 'bg-emerald-500/20',
      textColor: 'text-emerald-400',
    };
  }

  // Default by type
  switch (type) {
    case 'built':
      return {
        icon: Hammer,
        bgColor: 'bg-orange-500/20',
        textColor: 'text-orange-400',
      };
    case 'research':
      return {
        icon: Search,
        bgColor: 'bg-blue-500/20',
        textColor: 'text-blue-400',
      };
    case 'trend':
      return {
        icon: TrendingUp,
        bgColor: 'bg-pink-500/20',
        textColor: 'text-pink-400',
      };
    case 'attention':
      return {
        icon: AlertCircle,
        bgColor: 'bg-yellow-500/20',
        textColor: 'text-yellow-400',
      };
    default:
      return {
        icon: Sparkles,
        bgColor: 'bg-coder1-cyan/20',
        textColor: 'text-coder1-cyan',
      };
  }
}

function getPriorityConfig(priority: 'low' | 'medium' | 'high'): {
  bgColor: string;
  textColor: string;
} {
  switch (priority) {
    case 'high':
      return {
        bgColor: 'bg-red-500/30',
        textColor: 'text-red-400',
      };
    case 'medium':
      return {
        bgColor: 'bg-yellow-500/30',
        textColor: 'text-yellow-400',
      };
    case 'low':
    default:
      return {
        bgColor: 'bg-gray-500/30',
        textColor: 'text-gray-400',
      };
  }
}
