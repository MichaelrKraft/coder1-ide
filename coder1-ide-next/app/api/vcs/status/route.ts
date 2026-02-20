/**
 * GET /api/vcs/status
 * Returns the VCS connection status for the authenticated user.
 */
import { NextRequest, NextResponse } from 'next/server';
import { extractUserId } from '@/lib/auth/extract-user-id';
import type { VCSConnectionStatus } from '@/types/vcs';

export async function GET(request: NextRequest) {
  try {
    const userId = extractUserId(request);
    
    if (!userId || userId === 'default') {
      return NextResponse.json<VCSConnectionStatus>({
        connected: false,
        provider: 'github',
      });
    }

    // Check if user has a GitHub VCS token
    const { getAuthDatabase } = await import('@/lib/auth/db');
    const db = getAuthDatabase();
    
    const row = db.prepare(`
      SELECT 
        oa.access_token,
        oa.scope,
        oa.created_at,
        oa.provider_account_id
      FROM oauth_accounts oa
      WHERE oa.user_id = ? AND oa.provider IN ('github-vcs', 'github')
      ORDER BY oa.created_at DESC
      LIMIT 1
    `).get(userId) as {
      access_token: string;
      scope: string;
      created_at: string;
      provider_account_id: string;
    } | undefined;

    if (!row?.access_token) {
      return NextResponse.json<VCSConnectionStatus>({
        connected: false,
        provider: 'github',
      });
    }

    // Verify the token is still valid by making a lightweight API call
    let username: string | undefined;
    let avatarUrl: string | undefined;
    
    try {
      const { decryptToken, isEncryptedToken } = await import('@/lib/auth/token-encryption');
      const token = isEncryptedToken(row.access_token) 
        ? decryptToken(row.access_token) 
        : row.access_token;
      
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        username = userData.login;
        avatarUrl = userData.avatar_url;
      } else if (userResponse.status === 401) {
        // Token is expired/revoked
        return NextResponse.json<VCSConnectionStatus>({
          connected: false,
          provider: 'github',
        });
      }
    } catch {
      // If verification fails, assume connected but don't provide username
    }

    return NextResponse.json<VCSConnectionStatus>({
      connected: true,
      provider: 'github',
      username,
      avatarUrl,
      scopes: row.scope?.split(' ') ?? [],
      connectedAt: row.created_at,
      expiresAt: null, // GitHub tokens don't expire
    });
  } catch (error) {
    console.error('[VCS Status] Error:', error);
    return NextResponse.json<VCSConnectionStatus>({
      connected: false,
      provider: 'github',
    });
  }
}
