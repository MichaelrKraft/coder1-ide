/**
 * GitHub VCS OAuth Callback Route
 * Exchanges authorization code for access token, encrypts and stores it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encryptToken } from '@/lib/auth/token-encryption';
import { extractUserId } from '@/lib/auth/extract-user-id';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3001}`;

  // Handle OAuth errors from GitHub
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'Unknown error';
    return NextResponse.redirect(
      `${baseUrl}/ide?vcs_error=${encodeURIComponent(errorDescription)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/ide?vcs_error=${encodeURIComponent('Missing authorization code or state')}`
    );
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const storedState = cookieStore.get('vcs_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      `${baseUrl}/ide?vcs_error=${encodeURIComponent('Invalid OAuth state - please try again')}`
    );
  }

  // Clear the state cookie
  cookieStore.delete('vcs_oauth_state');

  // Get authenticated user
  const userId = extractUserId(request);
  if (!userId || userId === 'default') {
    return NextResponse.redirect(
      `${baseUrl}/ide?vcs_error=${encodeURIComponent('Please log in first')}`
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      error?: string;
      error_description?: string;
      scope?: string;
    };

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }

    // Fetch GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch GitHub user info');
    }

    const githubUser = await userResponse.json() as {
      id: number;
      login: string;
      avatar_url: string;
    };

    // Encrypt the token before storing
    const encryptedToken = encryptToken(tokenData.access_token);

    // Store as a separate VCS OAuth account (provider: 'github-vcs')
    const { linkOAuthAccount } = await import('@/lib/auth/db');
    linkOAuthAccount({
      user_id: userId,
      provider: 'github-vcs',
      provider_account_id: String(githubUser.id),
      access_token: encryptedToken,
      scope: tokenData.scope || 'repo read:org',
    });

    // Redirect back to IDE with success
    return NextResponse.redirect(
      `${baseUrl}/ide?vcs_connected=true&vcs_username=${encodeURIComponent(githubUser.login)}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth exchange failed';
    console.error('[VCS OAuth] Callback error:', message);
    return NextResponse.redirect(
      `${baseUrl}/ide?vcs_error=${encodeURIComponent(message)}`
    );
  }
}
