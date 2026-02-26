'use client';

import React from 'react';
import { Terminal, User } from 'lucide-react';
import { CommandCard } from './CommandCard';
import type { TeamRole } from '@/lib/team-permission';
import type { SlashCommand } from '@/types/slash-command';

// ============================================================================
// Types
// ============================================================================

interface CommandsListProps {
  teamCommands: SlashCommand[];
  personalCommands: SlashCommand[];
  onInstall: (command: SlashCommand) => void;
  onEdit: (command: SlashCommand) => void;
  onDelete: (command: SlashCommand) => void;
  installingSlug?: string | null;
  userRole?: TeamRole | null;
}

// ============================================================================
// Sub-components
// ============================================================================

function SectionHeader({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-1.5 px-1 mb-2">
      <span className="text-text-muted">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span className="text-[10px] text-text-muted ml-auto">
        {count}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }): React.ReactElement {
  return (
    <p className="text-text-muted text-xs text-center py-4 italic px-2">
      {message}
    </p>
  );
}

// ============================================================================
// Component
// ============================================================================

export function CommandsList({
  teamCommands,
  personalCommands,
  onInstall,
  onEdit,
  onDelete,
  installingSlug = null,
  userRole = null,
}: CommandsListProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      {/* Team Commands section */}
      <section>
        <SectionHeader
          icon={<Terminal className="w-3 h-3" />}
          label="Team Commands"
          count={teamCommands.length}
        />
        {teamCommands.length === 0 ? (
          <EmptyState message="No team commands yet. Create one to share with your team." />
        ) : (
          <div className="flex flex-col gap-2">
            {teamCommands.map((cmd) => (
              <CommandCard
                key={cmd.id}
                command={cmd}
                onInstall={onInstall}
                onEdit={onEdit}
                onDelete={onDelete}
                isInstalling={installingSlug === cmd.slug}
                userRole={userRole}
              />
            ))}
          </div>
        )}
      </section>

      {/* Personal Commands section */}
      <section>
        <SectionHeader
          icon={<User className="w-3 h-3" />}
          label="My Commands"
          count={personalCommands.length}
        />
        {personalCommands.length === 0 ? (
          <EmptyState message="No personal commands yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {personalCommands.map((cmd) => (
              <CommandCard
                key={cmd.id}
                command={cmd}
                onInstall={onInstall}
                onEdit={onEdit}
                onDelete={onDelete}
                isInstalling={installingSlug === cmd.slug}
                userRole={userRole}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
