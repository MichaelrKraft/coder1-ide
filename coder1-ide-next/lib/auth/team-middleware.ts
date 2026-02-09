import { NextRequest } from 'next/server';
import { verifyAccessToken, verifyRefreshToken } from './jwt';
import { getUserById, getTeamMembers } from './db';
import type { User, TeamMember } from './db';

/**
 * Extract and verify the authenticated user from a request.
 * Falls back to refresh token if access token is expired.
 */
export async function getAuthUser(request: NextRequest): Promise<User> {
  const token = request.cookies.get('auth-token')?.value
    || request.headers.get('authorization')?.replace('Bearer ', '');

  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded) {
      const user = getUserById(decoded.userId);
      if (!user) throw new Error('User not found');
      return user;
    }
  }

  // Access token missing or expired — try refresh token
  const refreshToken = request.cookies.get('refresh-token')?.value;
  if (refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded) {
      const user = getUserById(decoded.userId);
      if (!user) throw new Error('User not found');
      return user;
    }
  }

  throw new Error('Not authenticated');
}

/**
 * Require that a user is a member of the given team
 * Looks up membership from the database (not from JWT)
 */
export async function requireTeamMember(userId: string, teamId: string): Promise<TeamMember> {
  const members = getTeamMembers(teamId);
  const member = members.find(m => m.id === userId);
  if (!member) throw new Error('Not a team member');
  return member as unknown as TeamMember;
}

/**
 * Require that a user is an admin or owner of the given team
 */
export async function requireTeamAdmin(userId: string, teamId: string): Promise<TeamMember> {
  const member = await requireTeamMember(userId, teamId);
  if (member.role !== 'owner' && member.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return member;
}
