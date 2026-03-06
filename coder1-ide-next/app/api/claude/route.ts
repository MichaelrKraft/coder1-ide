/**
 * /api/claude — Legacy endpoint. Forwards to /api/ai for backward compatibility.
 *
 * All new code should use /api/ai directly. This route will be removed
 * after the 60-day migration period (see Phase 2B plan).
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Forward to the new provider-aware endpoint
  const url = new URL('/api/ai', request.url);
  const body = await request.text();

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: request.headers,
    body,
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function OPTIONS(request: NextRequest) {
  const url = new URL('/api/ai', request.url);

  const response = await fetch(url.toString(), {
    method: 'OPTIONS',
    headers: request.headers,
  });

  return new NextResponse(null, {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
  });
}