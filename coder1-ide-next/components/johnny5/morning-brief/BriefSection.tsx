'use client';

import React, { useState } from 'react';
import {
  Hammer,
  Search,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Brain,
  FileText,
} from 'lucide-react';
import type { Johnny5BriefItem } from '@/types/johnny5';
import BriefItem from './BriefItem';

type SectionType = 'built' | 'research' | 'trends' | 'attention' | 'learnings' | 'changes';

interface BriefSectionProps {
  type: SectionType;
  items: Johnny5BriefItem[];
  defaultExpanded?: boolean;
  onItemAction?: (item: Johnny5BriefItem) => void;
}

/**
 * BriefSection - Collapsible section component for Morning Brief
 *
 * Features:
 * - Icon and title based on type
 * - Item count badge
 * - Collapsible/expandable content
 * - Empty state message
 * - Animated transitions
 */
export default function BriefSection({
  type,
  items,
  defaultExpanded = true,
  onItemAction,
}: BriefSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const sectionConfig = getSectionConfig(type);
  const hasItems = items.length > 0;

  return (
    <div className="mb-4 last:mb-0">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between p-2.5 rounded-lg
          transition-all duration-200
          ${hasItems
            ? 'bg-transparent hover:bg-white/[0.03]'
            : 'bg-transparent opacity-60'
          }
        `}
      >
        <div className="flex items-center gap-2.5">
          {/* Section Icon */}
          <div
            className={`
              w-6 h-6 rounded-md flex items-center justify-center
              ${sectionConfig.bgColor}
            `}
          >
            <sectionConfig.icon className={`w-3.5 h-3.5 ${sectionConfig.textColor}`} />
          </div>

          {/* Section Title */}
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              {sectionConfig.title}
            </h3>

            {/* Item Count Badge */}
            <span
              className={`
                px-2 py-0.5 rounded-full text-[10px] font-bold
                ${hasItems
                  ? `${sectionConfig.badgeBg} ${sectionConfig.textColor}`
                  : 'bg-bg-tertiary text-text-muted'
                }
              `}
            >
              {items.length}
            </span>
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        {hasItems && (
          <div className="text-text-muted">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        )}
      </button>

      {/* Section Content */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded && hasItems ? 'max-h-[2000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="space-y-2 pl-1">
          {items.map((item) => (
            <BriefItem
              key={item.id}
              item={item}
              type={type === 'trends' ? 'trend' : type}
              onAction={onItemAction}
            />
          ))}
        </div>
      </div>

      {/* Empty State */}
      {!hasItems && (
        <div className="mt-2 py-3 px-4">
          <p className="text-xs text-text-muted/60 text-center italic">
            {sectionConfig.emptyMessage}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getSectionConfig(type: SectionType): {
  icon: typeof Hammer;
  title: string;
  bgColor: string;
  textColor: string;
  badgeBg: string;
  emptyMessage: string;
} {
  switch (type) {
    case 'built':
      return {
        icon: Hammer,
        title: 'Built Overnight',
        bgColor: 'bg-orange-500/20',
        textColor: 'text-orange-400',
        badgeBg: 'bg-orange-500/20',
        emptyMessage: 'No builds completed overnight. Johnny5 was focused on other tasks.',
      };
    case 'research':
      return {
        icon: Search,
        title: 'Research Completed',
        bgColor: 'bg-blue-500/20',
        textColor: 'text-blue-400',
        badgeBg: 'bg-blue-500/20',
        emptyMessage: 'No research tasks were scheduled for last night.',
      };
    case 'trends':
      return {
        icon: TrendingUp,
        title: 'Trends Spotted',
        bgColor: 'bg-pink-500/20',
        textColor: 'text-pink-400',
        badgeBg: 'bg-pink-500/20',
        emptyMessage: 'No significant trends detected in your monitored sources.',
      };
    case 'attention':
      return {
        icon: AlertCircle,
        title: 'Needs Your Attention',
        bgColor: 'bg-yellow-500/20',
        textColor: 'text-yellow-400',
        badgeBg: 'bg-yellow-500/20',
        emptyMessage: 'Nothing requires your immediate attention. Great job!',
      };
    case 'learnings':
      return {
        icon: Brain,
        title: 'What I Learned',
        bgColor: 'bg-purple-500/20',
        textColor: 'text-purple-400',
        badgeBg: 'bg-purple-500/20',
        emptyMessage: 'No new facts or patterns learned yesterday.',
      };
    case 'changes':
      return {
        icon: FileText,
        title: 'Living File Updates',
        bgColor: 'bg-emerald-500/20',
        textColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/20',
        emptyMessage: 'No living files were updated yesterday.',
      };
    default:
      return {
        icon: Hammer,
        title: 'Items',
        bgColor: 'bg-coder1-cyan/20',
        textColor: 'text-coder1-cyan',
        badgeBg: 'bg-coder1-cyan/20',
        emptyMessage: 'No items to display.',
      };
  }
}
