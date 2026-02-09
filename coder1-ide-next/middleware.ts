import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication (cookie check)
const PROTECTED_ROUTES = ['/ide', '/timeline', '/consultation', '/hooks', '/documentation'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth gate: redirect to /login if no auth-token cookie on protected routes
  if (PROTECTED_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Handle CORS for component-capture API
  if (pathname.startsWith('/api/component-capture')) {
    // Handle preflight OPTIONS request first
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // For actual requests, clone the response and add headers
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/component-capture', '/ide', '/ide/:path*', '/timeline', '/timeline/:path*', '/consultation', '/hooks', '/documentation'],
};
