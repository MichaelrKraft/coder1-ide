import { NextRequest, NextResponse } from 'next/server';
import { getGitHubTokens, getGitHubUser } from '@/lib/auth/github-oauth';
import { findOrCreateOAuthUser, createSession } from '@/lib/auth/db';
import { generateTokens } from '@/lib/auth/jwt';

/**
 * GET /api/v2/auth/github/callback
 * Handles the OAuth callback from GitHub
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL('/login?error=github_oauth_denied', baseUrl)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=missing_code', baseUrl)
      );
    }

    // Validate CSRF state parameter (edge case E2-3)
    const storedState = request.cookies.get('github-oauth-state')?.value;
    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_state', baseUrl)
      );
    }

    // Exchange code for tokens
    const tokens = await getGitHubTokens(code);

    // Get user info from GitHub
    const githubUser = await getGitHubUser(tokens.access_token);

    if (!githubUser.email) {
      return NextResponse.redirect(
        new URL('/login?error=no_email', baseUrl)
      );
    }

    // Find or create user in our database (E2-2 handled by findOrCreateOAuthUser)
    const user = findOrCreateOAuthUser(
      'github',
      githubUser.id.toString(),
      githubUser.email,
      githubUser.name || githubUser.login
    );

    // Generate our JWT tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      email: user.email,
      username: user.username,
      subscriptionTier: user.subscription_tier as 'free' | 'pro' | 'team',
    });

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days for refresh token

    createSession({
      user_id: user.id,
      token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      user_agent: request.headers.get('user-agent') || undefined,
      ip_address: request.ip || undefined,
    });

    // Create response with redirect to IDE
    // Include invite code if alpha mode is enabled
    const alphaCode = process.env.ALPHA_INVITE_CODE;
    const isAlphaMode = process.env.ALPHA_MODE_ENABLED === 'true';
    const redirectUrl = isAlphaMode && alphaCode
      ? `/ide?invite=${alphaCode}`
      : '/ide';

    const response = NextResponse.redirect(
      new URL(redirectUrl, baseUrl)
    );

    // Set auth cookies
    response.cookies.set('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    response.cookies.set('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Clear the CSRF state cookie
    response.cookies.delete('github-oauth-state');

    return response;
  } catch (error) {
    return NextResponse.redirect(
      new URL('/login?error=oauth_failed', baseUrl)
    );
  }
}
