/**
 * WebSocket Authentication Ticket API
 * Generates secure tickets for WebSocket authentication.
 *
 * SECURITY FIX (Sep 12, 2026): the ticket's userId is derived from a verified
 * access token (Authorization header or auth-token cookie). Previously it was a
 * hash of a client-supplied sessionId, so any anonymous caller could obtain a
 * ticket carrying terminal + files permissions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { wsAuthManager } from '../../../../../lib/websocket-auth';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';

const TIMESTAMP_TOLERANCE_MS = 60000;

function getVerifiedUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded?.userId) return decoded.userId;
    }
  }

  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    const decoded = verifyAccessToken(cookieToken);
    if (decoded?.userId) return decoded.userId;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, bridgeAuth = false, timestamp } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Verify timestamp is recent (prevent replay attacks)
    const now = Date.now();
    if (!timestamp || Math.abs(now - timestamp) > TIMESTAMP_TOLERANCE_MS) {
      return NextResponse.json(
        { error: 'Invalid or expired timestamp' },
        { status: 400 }
      );
    }

    const userId = getVerifiedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Permissions are fixed server-side; the client cannot request extra ones.
    const permissions = bridgeAuth === true
      ? ['terminal', 'files', 'bridge', 'claude-cli']
      : ['terminal', 'files'];

    const ticket = wsAuthManager.generateTicket(
      userId,
      sessionId,
      bridgeAuth === true,
      permissions
    );

    console.log('🎫 WebSocket ticket generated for client:', {
      userId: userId.substring(0, 8),
      bridgeAuth: bridgeAuth === true,
      permissions,
      ticketId: ticket.ticketId.substring(0, 8) + '...'
    });

    return NextResponse.json({
      ticketId: ticket.ticketId,
      expiresAt: ticket.expiresAt,
      permissions: ticket.permissions
    });

  } catch (error) {
    console.error('❌ Error generating WebSocket ticket:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication ticket' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Health check and stats endpoint
  try {
    const stats = wsAuthManager.getStats();

    return NextResponse.json({
      service: 'WebSocket Authentication',
      status: 'healthy',
      stats
    });

  } catch (error) {
    console.error('❌ Error getting WebSocket auth stats:', error);
    return NextResponse.json(
      { error: 'Failed to get authentication stats' },
      { status: 500 }
    );
  }
}
