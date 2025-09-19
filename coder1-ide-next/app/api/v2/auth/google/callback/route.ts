import { NextRequest, NextResponse } from 'next/server';
import { getGoogleTokens, getGoogleUser } from '@/lib/auth/google-oauth';
import { findOrCreateOAuthUser, createSession } from '@/lib/auth/db';
import { generateTokens } from '@/lib/auth/jwt';

/**
 * GET /api/v2/auth/google/callback
 * Handles the OAuth callback from Google
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL('/auth/login?error=google_oauth_denied', request.url)
      );
    }
    
    if (!code) {
      return NextResponse.redirect(
        new URL('/auth/login?error=missing_code', request.url)
      );
    }
    
    // Exchange code for tokens
    const tokens = await getGoogleTokens(code);
    
    // Get user info from Google
    const googleUser = await getGoogleUser(tokens.access_token);
    
    // Find or create user in our database
    const user = findOrCreateOAuthUser(
      'google',
      googleUser.sub,
      googleUser.email,
      googleUser.name
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
    
    // Create response with redirect to dashboard
    const response = NextResponse.redirect(
      new URL('/auth/dashboard', request.url)
    );
    
    // Set cookies
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
    
    return response;
  } catch (error) {
    // logger?.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=oauth_failed', request.url)
    );
  }
}