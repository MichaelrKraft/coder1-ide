import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';

/**
 * Extract the authenticated userId from a request.
 *
 * Resolution order:
 *   1. `Authorization` header bearer token
 *   2. `auth-token` cookie
 *   3. In development only, a `'default'` fallback
 *
 * Returns `null` when unauthenticated (caller should return 401).
 *
 * Extracted verbatim from app/api/sessions/route.ts so every API route can
 * share one correct auth path instead of each re-implementing (or skipping) it.
 */
export function getAuthenticatedUserId(request: NextRequest): string | null {
  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) return decoded.userId;
    }
  }

  // 2. Fall back to auth-token cookie
  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    const decoded = verifyAccessToken(cookieToken);
    if (decoded) return decoded.userId;
  }

  // 3. Development mode fallback
  if (process.env.NODE_ENV === 'development') {
    return 'default';
  }

  return null;
}

/**
 * Result of {@link requireUser}: either an authenticated userId, or a ready-to-return
 * 401 response. Usage:
 *
 *   const auth = requireUser(request);
 *   if ('response' in auth) return auth.response;
 *   const userId = auth.userId;
 */
export type RequireUserResult =
  | { userId: string; response?: undefined }
  | { userId?: undefined; response: NextResponse };

/**
 * Like {@link getAuthenticatedUserId}, but returns a prebuilt 401 response when
 * unauthenticated so routes can guard with a single early return.
 */
export function requireUser(request: NextRequest): RequireUserResult {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return {
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }
  return { userId };
}
