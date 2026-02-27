import { NextRequest, NextResponse } from 'next/server';

const ADMIN_TOKEN = process.env.ALPHA_ADMIN_TOKEN || 'coder1-alpha-2025';

export function verifyAdminRequest(request: NextRequest): boolean {
  // Check cookie
  const cookie = request.cookies.get('coder1-admin')?.value;
  if (cookie === ADMIN_TOKEN) return true;

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.includes(ADMIN_TOKEN)) return true;

  return false;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
