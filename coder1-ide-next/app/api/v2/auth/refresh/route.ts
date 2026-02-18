import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/auth/jwt';
import { refreshSessionToken } from '@/lib/auth';

/**
 * POST /api/v2/auth/refresh
 * Exchange a valid refresh token for a new access token.
 * The refresh-token cookie is read automatically (httpOnly).
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh-token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    // Verify refresh token and generate new access token
    const result = refreshAccessToken(refreshToken);
    if (!result) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    // Update the session in the database with the new access token
    const session = await refreshSessionToken(refreshToken, result.accessToken, result.expiresAt);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    // Set the new auth-token cookie
    const response = NextResponse.json({ success: true });

    response.cookies.set('auth-token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
