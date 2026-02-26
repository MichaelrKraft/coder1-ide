import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ADMIN_TOKEN = process.env.ALPHA_ADMIN_TOKEN;

// Rate limiter: max 5 attempts per IP per 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const WINDOW = 15 * 60 * 1000;
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count++;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    if (!ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Admin endpoint not configured' }, { status: 503 });
    }

    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password || password !== ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('coder1-admin', ADMIN_TOKEN, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  if (!ADMIN_TOKEN) return NextResponse.json({ isAdmin: false });
  const adminToken = request.cookies.get('coder1-admin')?.value;
  const isAdmin = !!adminToken && adminToken === ADMIN_TOKEN;
  return NextResponse.json({ isAdmin });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('coder1-admin');
  return response;
}
