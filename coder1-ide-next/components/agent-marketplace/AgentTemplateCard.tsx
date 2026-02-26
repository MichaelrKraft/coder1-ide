'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { AgentMarketplaceTemplate } from '@/types/agent-marketplace';
import type { TeamRole } from '@/lib/team-permission';
import { AgentPermissionBadge } from './AgentPermissionBadge';

// ============================================================================
// Types
// ============================================================================

export interface AgentTemplateCardProps {
  template: AgentMarketplaceTemplate;
  onActivate: (template: AgentMarketplaceTemplate) => void;
  onDeactivate: (templateId: string) => void;
  onViewDetail: (template: AgentMarketplaceTemplate) => void;
  isActivating?: boolean;
  userRole?: TeamRole | null;
}

// ============================================================================
// Helpers
// ============================================================================

function formatCategory(category: string): string {
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================================================
// Component
// ============================================================================

export function AgentTemplateCard({
  template,
  onActivate,
  onDeactivate,
  onViewDetail,
  isActivating = false,
  userRole,
}: AgentTemplateCardProps): React.ReactElement {
  const canManage = userRole != null;

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (template.isActivated) {
      onDeactivate(template.id);
    } else {
      onActivate(template);
    }
  };

  return (
    <div
      className="relative bg-bg-secondary border border-border-default rounded-lg p-4 cursor-pointer hover:border-coder1-cyan/40 transition-colors flex flex-col gap-2"
      onClick={() => onViewDetail(template)}
    >
      {/* Corner badge */}
      <span className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border-default">
        {template.isBuiltIn ? 'Built-in' : 'Team'}
      </span>

      {/* Header row */}
      <div className="flex items-start gap-2 pr-12">
        <span
          className="w-3 h-3 rounded-full mt-0.5 shrink-0"
          style={{ backgroundColor: template.agentConfig.color }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary leading-snug truncate">
            {template.name}
          </p>
          <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2 leading-snug">
            {template.description}
          </p>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <AgentPermissionBadge level={template.permissionLevel} />
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-bg-tertiary text-text-muted border border-border-default">
          {formatCategory(template.category)}
        </span>
      </div>

      {/* Action button */}
      {canManage && (
        <button
          onClick={handleActionClick}
          disabled={isActivating}
          className={`mt-auto w-full flex items-center justify-center gap-1.5 py-1 rounded text-xs font-medium transition-colors ${
            template.isActivated
              ? 'bg-coder1-cyan/10 text-coder1-cyan border border-coder1-cyan/30 hover:bg-coder1-cyan/20'
              : 'bg-bg-tertiary text-text-secondary border border-border-default hover:border-coder1-cyan/40 hover:text-coder1-cyan'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isActivating ? (
            <span className="animate-pulse">Activating…</span>
          ) : template.isActivated ? (
            <>
              <Check className="w-3 h-3" />
              Activated
            </>
          ) : (
            'Activate'
          )}
        </button>
      )}
    </div>
  );
}
