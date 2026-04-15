import { NextRequest } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';

export function getAuthenticatedUserId(request: NextRequest): string | null {
  // Dev bypass: local dev has no auth server, so all requests are userId='default'.
  // This MUST NOT run in production — the condition below ensures that.
  // If you see 'default' userId in prod logs, this bypass is leaking.
  if (process.env.NODE_ENV === 'development') {
    return 'default';
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) return decoded.userId;
    }
  }

  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    const decoded = verifyAccessToken(cookieToken);
    if (decoded) return decoded.userId;
  }

  return null;
}
