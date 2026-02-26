'use client';

import React from 'react';
import { canEdit, canDelete, canManageTeam } from '@/lib/team-permission';
import type { TeamRole } from '@/lib/team-permission';

// ============================================================================
// Types
// ============================================================================

interface TeamPermissionGateProps {
  /** Minimum role required to see children */
  requiredRole: 'member' | 'admin' | 'owner';
  /** The current user's role. null = not in team = no access */
  userRole: TeamRole | null;
  children: React.ReactNode;
  /** Rendered when permission is denied. Default: null */
  fallback?: React.ReactNode;
}

// ============================================================================
// Helpers
// ============================================================================

function hasPermission(requiredRole: 'member' | 'admin' | 'owner', userRole: TeamRole): boolean {
  switch (requiredRole) {
    case 'member':
      return canEdit(userRole); // owner | admin | member
    case 'admin':
      return canManageTeam(userRole); // owner | admin
    case 'owner':
      return userRole === 'owner';
    default:
      return false;
  }
}

// ============================================================================
// Component
// ============================================================================

export function TeamPermissionGate({
  requiredRole,
  userRole,
  children,
  fallback = null,
}: TeamPermissionGateProps): React.ReactElement {
  if (userRole === null) {
    return <>{fallback}</>;
  }

  // canDelete is used as a proxy check to distinguish admin from member requirements
  // when admin gate is active, but the primary check is hasPermission.
  if (!hasPermission(requiredRole, userRole)) {
    return <>{fallback}</>;
  }

  // Additional owner-level check for completeness
  if (requiredRole === 'owner' && userRole !== 'owner') {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Re-export for convenience so consumers can import role helpers alongside the gate
export { canEdit, canDelete, canManageTeam };
export type { TeamRole };
