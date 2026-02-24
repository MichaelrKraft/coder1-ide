import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication (cookie check)
const PROTECTED_ROUTES = ['/ide', '/timeline', '/consultation', '/hooks', '/documentation'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth gate: redirect to /login if no auth-token cookie on protected routes
  // Skip auth check in development mode
  if (PROTECTED_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    if (process.env.NODE_ENV !== 'development') {
      const authToken = request.cookies.get('auth-token')?.value;
      if (!authToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // Handle CORS for component-capture API
  // SECURITY NOTE (Feb 23, 2026): This endpoint allows any origin because it's designed
  // to capture components from external websites. It should NOT handle sensitive data
  // or accept credentials. If auth is needed, use a different endpoint.
  if (pathname.startsWith('/api/component-capture')) {
    // Handle preflight OPTIONS request first
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          // SECURITY: Remove Authorization header - this endpoint should not handle auth
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // For actual requests, clone the response and add headers
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/component-capture', '/ide', '/ide/:path*', '/timeline', '/timeline/:path*', '/consultation', '/hooks', '/documentation'],
};
