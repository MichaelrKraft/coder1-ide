import { NextResponse } from 'next/server';
import { checkDashboardAuth } from '@/lib/auth';

/**
 * POST /api/dashboard-auth
 *
 * Password login for the founder dashboard. On success, sets an
 * httpOnly cookie that the middleware checks on subsequent requests
 * to /dashboard and sub-routes.
 *
 * The cookie value IS the password (single-founder model). This is
 * intentional for MVP — moving to session tokens is a future hardening
 * step when Deckpress becomes multi-tenant.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const { password } = (body ?? {}) as { password?: string };
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'password is required' }, { status: 400 });
  }

  if (!checkDashboardAuth(password)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('dashboard-auth', password, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return response;
}
