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

/**
 * Extract subscription tier from request authentication.
 * Returns the tier from JWT claims, or 'free' as default.
 * Used for server-side premium gating.
 */
export function extractSubscriptionTier(request: NextRequest): string {
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) return decoded.subscriptionTier || 'free';
    }
  }

  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    const decoded = verifyAccessToken(cookieToken);
    if (decoded) return decoded.subscriptionTier || 'free';
  }

  return 'free';
}

/**
 * Check if the request has premium access (pro, team, or alpha tier).
 * Use this for server-side premium gating on API routes.
 */
export function hasPremiumAccess(request: NextRequest): boolean {
  const tier = extractSubscriptionTier(request);
  return ['pro', 'team', 'alpha'].includes(tier);
}
