'use client';

import React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface PresenceUser {
  userId: string;
  userName: string;
  /** Hex color assigned to the user, e.g. "#3b82f6" */
  color: string;
}

interface PresenceAvatarsProps {
  users: PresenceUser[];
  /** Maximum number of avatars shown before "+N" overflow. Default: 3 */
  maxVisible?: number;
  /** Avatar size variant. Default: 'sm' */
  size?: 'sm' | 'md';
}

// ============================================================================
// Helpers
// ============================================================================

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

// ============================================================================
// Component
// ============================================================================

export function PresenceAvatars({
  users,
  maxVisible = 3,
  size = 'sm',
}: PresenceAvatarsProps): React.ReactElement | null {
  if (users.length === 0) return null;

  const visible = users.slice(0, maxVisible);
  const overflow = users.length - maxVisible;

  const sizeClasses = size === 'sm'
    ? 'w-6 h-6 text-xs'
    : 'w-8 h-8 text-sm';

  return (
    <div className="flex items-center -space-x-1" aria-label="Online collaborators">
      {visible.map((user) => (
        <div
          key={user.userId}
          className={`${sizeClasses} rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-background select-none shrink-0`}
          style={{ backgroundColor: user.color }}
          title={user.userName}
          aria-label={user.userName}
        >
          {getInitial(user.userName)}
        </div>
      ))}

      {overflow > 0 && (
        <div
          className={`${sizeClasses} rounded-full flex items-center justify-center font-semibold text-muted-foreground bg-muted ring-2 ring-background shrink-0`}
          title={`${overflow} more`}
          aria-label={`${overflow} more collaborators`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
