import { NextRequest, NextResponse } from 'next/server';

/**
 * Auth middleware for the founder dashboard.
 * - /dashboard/login is public (serves the password form)
 * - /dashboard and all sub-routes require a cookie matching DASHBOARD_PASSWORD
 * - Cookie is set by /api/dashboard-auth on successful login
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/dashboard/login' || pathname.startsWith('/dashboard/login/')) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('dashboard-auth');
  if (cookie?.value && cookie.value === process.env.DASHBOARD_PASSWORD) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/dashboard/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
