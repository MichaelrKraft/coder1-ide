import { NextRequest } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';

export function getAuthenticatedUserId(request: NextRequest): string | null {
  // In development, always return 'default' to prevent userId splits
  // between authenticated and unauthenticated states
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
