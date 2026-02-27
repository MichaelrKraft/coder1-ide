/**
 * Team Permission Utility
 *
 * Role-based permission helpers for team collaboration features.
 * Keep this file pure (no imports, no side effects) so it can be used
 * safely on both client and server.
 */

export type TeamRole = 'owner' | 'admin' | 'member';

/** Any authenticated team member can edit assets. */
export function canEdit(role: TeamRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'member';
}

/** Only owners and admins can delete assets. */
export function canDelete(role: TeamRole): boolean {
  return role === 'owner' || role === 'admin';
}

/** Only owners and admins can publish (promote) assets team-wide. */
export function canPublish(role: TeamRole): boolean {
  return role === 'owner' || role === 'admin';
}

/** Only owners and admins can manage team membership and settings. */
export function canManageTeam(role: TeamRole): boolean {
  return role === 'owner' || role === 'admin';
}

/** Human-readable label for a role. */
export function getRoleDisplayName(role: TeamRole): string {
  const names: Record<TeamRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
  };
  return names[role];
}
