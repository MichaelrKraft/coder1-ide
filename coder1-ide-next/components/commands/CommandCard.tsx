'use client';

import React from 'react';
import { Download, CheckCircle, Edit2, Trash2, Braces } from 'lucide-react';
import { TeamPermissionGate } from '@/components/shared/TeamPermissionGate';
import type { TeamRole } from '@/lib/team-permission';
import type { SlashCommand, CommandCategory } from '@/types/slash-command';

// ============================================================================
// Types
// ============================================================================

interface CommandCardProps {
  command: SlashCommand;
  onInstall: (command: SlashCommand) => void;
  onEdit?: (command: SlashCommand) => void;
  onDelete?: (command: SlashCommand) => void;
  isInstalling?: boolean;
  userRole?: TeamRole | null;
}

// ============================================================================
// Helpers
// ============================================================================

const CATEGORY_COLORS: Record<CommandCategory, string> = {
  workflow: 'bg-blue-500/20 text-blue-400',
  review: 'bg-purple-500/20 text-purple-400',
  testing: 'bg-green-500/20 text-green-400',
  docs: 'bg-cyan-500/20 text-cyan-400',
  git: 'bg-orange-500/20 text-orange-400',
  deployment: 'bg-red-500/20 text-red-400',
  debugging: 'bg-yellow-500/20 text-yellow-400',
  general: 'bg-gray-500/20 text-gray-400',
};

// ============================================================================
// Component
// ============================================================================

export function CommandCard({
  command,
  onInstall,
  onEdit,
  onDelete,
  isInstalling = false,
  userRole = null,
}: CommandCardProps): React.ReactElement {
  const categoryColor = CATEGORY_COLORS[command.category] ?? CATEGORY_COLORS.general;

  return (
    <div className="bg-bg-tertiary border border-border-default rounded-md p-3 hover:border-border-hover transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-text-primary text-sm font-medium truncate">
            {command.name}
          </span>
          {command.hasArguments && (
            <span
              title="Accepts $ARGUMENTS"
              className="flex-shrink-0 text-coder1-cyan"
            >
              <Braces className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Edit — member+ */}
          <TeamPermissionGate requiredRole="member" userRole={userRole}>
            {onEdit && (
              <button
                onClick={() => onEdit(command)}
                className="p-1 text-text-muted hover:text-text-secondary transition-colors rounded"
                title="Edit command"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </TeamPermissionGate>

          {/* Delete — admin+ */}
          <TeamPermissionGate requiredRole="admin" userRole={userRole}>
            {onDelete && (
              <button
                onClick={() => onDelete(command)}
                className="p-1 text-text-muted hover:text-red-400 transition-colors rounded"
                title="Delete command"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </TeamPermissionGate>

          {/* Install button */}
          <button
            onClick={() => !command.isInstalled && !isInstalling && onInstall(command)}
            disabled={command.isInstalled || isInstalling}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              command.isInstalled
                ? 'bg-green-500/20 text-green-400 cursor-default'
                : isInstalling
                ? 'bg-bg-secondary text-text-muted cursor-not-allowed'
                : 'bg-coder1-cyan/20 text-coder1-cyan hover:bg-coder1-cyan/30'
            }`}
          >
            {command.isInstalled ? (
              <>
                <CheckCircle className="w-3 h-3" />
                Installed
              </>
            ) : isInstalling ? (
              <>
                <Download className="w-3 h-3 animate-bounce" />
                Installing…
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                Install
              </>
            )}
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-text-muted text-xs leading-relaxed mb-2 line-clamp-2">
        {command.description}
      </p>

      {/* Footer: category + slug + tags */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${categoryColor}`}>
          {command.category}
        </span>
        <span className="text-[10px] text-text-muted font-mono">
          /{command.slug}
        </span>
        {command.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[10px] text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
