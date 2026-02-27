'use client';

import React from 'react';
import { X, Check } from 'lucide-react';
import type { AgentMarketplaceTemplate } from '@/types/agent-marketplace';
import { AgentPermissionBadge } from './AgentPermissionBadge';

// ============================================================================
// Types
// ============================================================================

interface AgentTemplateDetailProps {
  template: AgentMarketplaceTemplate | null;
  onClose: () => void;
  onActivate: (template: AgentMarketplaceTemplate) => void;
  onDeactivate: (templateId: string) => void;
  isActivating?: boolean;
}

// ============================================================================
// Permission explanations
// ============================================================================

const PERMISSION_EXPLANATIONS: Record<string, string> = {
  'read-only': 'Can only read files and search the codebase. Cannot modify anything.',
  'file-write': 'Can read and write files in the project. Cannot run terminal commands.',
  terminal: 'Can read, write files, and execute terminal commands. Use with care.',
  full: 'Unrestricted access to all tools including external APIs and system commands.',
};

// ============================================================================
// Component
// ============================================================================

export function AgentTemplateDetail({
  template,
  onClose,
  onActivate,
  onDeactivate,
  isActivating = false,
}: AgentTemplateDetailProps): React.ReactElement | null {
  if (!template) return null;

  const handleAction = () => {
    if (template.isActivated) {
      onDeactivate(template.id);
    } else {
      onActivate(template);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary border-l border-border-default">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: template.agentConfig.color }}
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold text-text-primary truncate">{template.name}</h3>
          <span className="text-[10px] text-text-muted shrink-0">v{template.version}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Description */}
        <div>
          <p className="text-text-secondary leading-relaxed">
            {template.longDescription || template.description}
          </p>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-1.5">
          <AgentPermissionBadge level={template.permissionLevel} />
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-bg-tertiary text-text-muted border border-border-default">
            {template.category}
          </span>
          {template.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-bg-tertiary text-text-muted border border-border-default"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Permission explanation */}
        <div className="bg-bg-tertiary rounded p-3 border border-border-default">
          <p className="text-[11px] font-medium text-text-secondary mb-1">What this agent can do</p>
          <p className="text-text-muted leading-relaxed">
            {PERMISSION_EXPLANATIONS[template.permissionLevel]}
          </p>
        </div>

        {/* Tools */}
        {template.agentConfig.tools.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-text-secondary mb-1.5">Available Tools</p>
            <div className="flex flex-wrap gap-1">
              {template.agentConfig.tools.map((tool) => (
                <span
                  key={tool}
                  className="px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border-default text-[10px] font-mono"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Estimated tokens */}
        <div>
          <p className="text-[11px] font-medium text-text-secondary mb-1">Estimated Usage</p>
          <p className="text-text-muted">
            ~{template.estimatedTokensPerRun.toLocaleString()} tokens per run
          </p>
        </div>

        {/* Author */}
        <div className="text-text-muted">
          By <span className="text-text-secondary">{template.author}</span>
        </div>
      </div>

      {/* Footer action */}
      <div className="p-4 border-t border-border-default">
        <button
          onClick={handleAction}
          disabled={isActivating}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded text-sm font-medium transition-colors ${
            template.isActivated
              ? 'bg-coder1-cyan/10 text-coder1-cyan border border-coder1-cyan/30 hover:bg-coder1-cyan/20'
              : 'bg-coder1-cyan text-bg-primary hover:bg-coder1-cyan/90'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isActivating ? (
            <span className="animate-pulse">Processing…</span>
          ) : template.isActivated ? (
            <>
              <Check className="w-4 h-4" />
              Deactivate Agent
            </>
          ) : (
            'Activate Agent'
          )}
        </button>
      </div>
    </div>
  );
}
