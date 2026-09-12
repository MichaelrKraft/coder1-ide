/**
 * @jest-environment node
 *
 * Regression test for the 2026-09-12 ticket exposure: POST /api/websocket/auth/ticket
 * issued terminal+files tickets to anonymous callers, deriving the user from a
 * client-supplied session id.
 */
import { NextRequest } from 'next/server';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-sec-2026-09-12';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-sec-2026-09-12';

import { POST } from '@/app/api/websocket/auth/ticket/route';
import { generateTokens } from '@/lib/auth/jwt';
import { wsAuthManager } from '@/lib/websocket-auth';

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3001/api/websocket/auth/ticket', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

describe('POST /api/websocket/auth/ticket (sec-2026-09-12)', () => {
  const validBody = () => ({ sessionId: 'probe-session', timestamp: Date.now() });

  it('returns 401 for an anonymous caller with a well-formed body', async () => {
    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ticketId).toBeUndefined();
  });

  it('returns 401 for a forged auth-token cookie', async () => {
    const res = await POST(makeRequest(validBody(), { cookie: 'auth-token=not.a.jwt' }));
    expect(res.status).toBe(401);
  });

  it('still validates the body before auth', async () => {
    const res = await POST(makeRequest({ timestamp: Date.now() }));
    expect(res.status).toBe(400);
  });

  it('issues a ticket bound to the verified user, not the session id', async () => {
    const { accessToken } = generateTokens({ userId: 'user_verified', email: 'v@example.com' } as never);
    const res = await POST(makeRequest(validBody(), { cookie: `auth-token=${accessToken}` }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.permissions).toEqual(['terminal', 'files']);

    const consumed = wsAuthManager.consumeTicket(json.ticketId);
    expect(consumed.success).toBe(true);
    expect(consumed.ticket.userId).toBe('user_verified');
  });

  it('accepts a bearer token in the Authorization header', async () => {
    const { accessToken } = generateTokens({ userId: 'user_bearer', email: 'b@example.com' } as never);
    const res = await POST(makeRequest(validBody(), { authorization: `Bearer ${accessToken}` }));
    expect(res.status).toBe(200);
  });
});
