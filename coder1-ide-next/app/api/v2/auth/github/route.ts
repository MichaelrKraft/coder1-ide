import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getGitHubOAuthURL } from '@/lib/auth/github-oauth';

/**
 * GET /api/v2/auth/github
 * Redirects to GitHub OAuth consent screen
 */
export async function GET(request: NextRequest) {
  try {
    // Generate CSRF state parameter
    const state = randomBytes(16).toString('hex');

    const url = getGitHubOAuthURL(state);

    const response = NextResponse.redirect(url);

    // Store state in cookie for validation in callback
    response.cookies.set('github-oauth-state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to initiate GitHub OAuth' },
      { status: 500 }
    );
  }
}
