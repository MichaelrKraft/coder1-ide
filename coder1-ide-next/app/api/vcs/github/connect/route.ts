/**
 * GitHub VCS OAuth Connect Route
 * Initiates incremental OAuth flow requesting repo + read:org scopes.
 * This is separate from the login OAuth which only requests user:email.
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

const VCS_SCOPES = 'repo read:org';

export async function GET(request: NextRequest) {
  // Feature flag check
  if (process.env.NEXT_PUBLIC_GITHUB_OAUTH_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'GitHub VCS integration is not enabled' },
      { status: 403 }
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'GitHub OAuth is not configured' },
      { status: 500 }
    );
  }

  // Generate CSRF state token
  const state = randomBytes(32).toString('hex');

  // Store state in cookie for callback verification
  const cookieStore = await cookies();
  cookieStore.set('vcs_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  // Build redirect URI for VCS-specific callback
  const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3001}`;
  const redirectUri = `${baseUrl}/api/vcs/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: VCS_SCOPES,
    state,
  });

  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  return NextResponse.redirect(githubAuthUrl);
}
