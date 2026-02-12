import { NextRequest } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';

/**
 * Extract userId from request authentication.
 * Checks Authorization header first (API clients, bridge),
 * then falls back to auth-token cookie (browser clients).
 * Returns 'default' if no auth is present (dev/anonymous mode).
 */
export function extractUserId(request: NextRequest): string {
  // 1. Check Authorization header first (API clients, bridge)
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) return decoded.userId;
    }
  }

  // 2. Fall back to auth-token cookie (browser clients)
  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    const decoded = verifyAccessToken(cookieToken);
    if (decoded) return decoded.userId;
  }

  // 3. No auth = dev/anonymous mode
  return 'default';
}
