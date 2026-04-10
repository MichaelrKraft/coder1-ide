import { NextRequest, NextResponse } from 'next/server';
import { extractUserId } from '@/lib/auth/extract-user-id';
import { verifyAccessToken, extractTokenFromHeader, generateApiToken } from '@/lib/auth/jwt';

/**
 * GET /api/auth/token
 *
 * Returns a long-lived (1 year) API token for the current user.
 * Used by external integrations like Ambient AI to authenticate
 * against the Coder1 API without relying on the short-lived session cookie.
 *
 * Requires: valid auth cookie or Authorization header.
 */
export async function GET(request: NextRequest) {
  const userId = extractUserId(request);
  if (userId === 'default') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Decode the current session to get the full payload (email, username, tier)
  const authHeader = request.headers.get('Authorization');
  const cookieToken = request.cookies.get('auth-token')?.value;
  const rawToken = authHeader ? extractTokenFromHeader(authHeader) : cookieToken;
  const decoded = rawToken ? verifyAccessToken(rawToken) : null;

  if (!decoded) {
    return NextResponse.json({ error: 'Could not decode session' }, { status: 401 });
  }

  const apiToken = generateApiToken({
    userId: decoded.userId,
    email: decoded.email,
    username: decoded.username,
    subscriptionTier: decoded.subscriptionTier,
  });

  return NextResponse.json({ token: apiToken });
}
