'use client';

import React from 'react';
import {
  Twitter,
  Github,
  Newspaper,
  Building2,
  Webhook,
} from 'lucide-react';
import type { Johnny5TrendAlert } from '@/types/johnny5';

interface TrendSourceProps {
  source: Johnny5TrendAlert['source'];
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * TrendSource Component
 *
 * Displays a source indicator for trend alerts with appropriate icons and colors.
 *
 * Source colors:
 * - X (Twitter): Blue (#1DA1F2)
 * - GitHub: Purple (#8B5CF6)
 * - HackerNews: Orange (#FF6600)
 * - Competitor: Red/Pink
 * - Custom: Cyan (Coder1 brand)
 */
export default function TrendSource({
  source,
  size = 'md',
  showLabel = false,
  className = '',
}: TrendSourceProps) {
  const config = getSourceConfig(source);
  const sizeClasses = getSizeClasses(size);

  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        ${className}
      `}
      title={config.label}
    >
      <div
        className={`
          flex items-center justify-center rounded-md
          ${sizeClasses.container}
          ${config.bgColor}
        `}
      >
        <config.icon className={`${sizeClasses.icon} ${config.textColor}`} />
      </div>
      {showLabel && (
        <span className={`${sizeClasses.label} ${config.textColor} font-medium`}>
          {config.label}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

interface SourceConfig {
  icon: typeof Twitter;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

function getSourceConfig(source: Johnny5TrendAlert['source']): SourceConfig {
  switch (source) {
    case 'x':
      return {
        icon: Twitter,
        label: 'X (Twitter)',
        bgColor: 'bg-blue-500/20',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/40',
      };
    case 'github':
      return {
        icon: Github,
        label: 'GitHub',
        bgColor: 'bg-purple-500/20',
        textColor: 'text-purple-400',
        borderColor: 'border-purple-500/40',
      };
    case 'hackernews':
      return {
        icon: Newspaper,
        label: 'Hacker News',
        bgColor: 'bg-orange-500/20',
        textColor: 'text-orange-400',
        borderColor: 'border-orange-500/40',
      };
    case 'competitor':
      return {
        icon: Building2,
        label: 'Competitor',
        bgColor: 'bg-pink-500/20',
        textColor: 'text-pink-400',
        borderColor: 'border-pink-500/40',
      };
    case 'custom':
    default:
      return {
        icon: Webhook,
        label: 'Custom',
        bgColor: 'bg-coder1-cyan/20',
        textColor: 'text-coder1-cyan',
        borderColor: 'border-coder1-cyan/40',
      };
  }
}

function getSizeClasses(size: 'sm' | 'md' | 'lg'): {
  container: string;
  icon: string;
  label: string;
} {
  switch (size) {
    case 'sm':
      return {
        container: 'w-5 h-5',
        icon: 'w-3 h-3',
        label: 'text-[10px]',
      };
    case 'lg':
      return {
        container: 'w-8 h-8',
        icon: 'w-5 h-5',
        label: 'text-sm',
      };
    case 'md':
    default:
      return {
        container: 'w-6 h-6',
        icon: 'w-4 h-4',
        label: 'text-xs',
      };
  }
}

// Export helper for use in other components
export { getSourceConfig };
