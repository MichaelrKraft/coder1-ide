/**
 * WebSocket Authentication Ticket API
 * Generates secure tickets for WebSocket authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { wsAuthManager } from '../../../../../lib/websocket-auth';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, bridgeAuth = false, timestamp } = body;

    // Basic validation
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Verify timestamp is recent (prevent replay attacks)
    const now = Date.now();
    if (!timestamp || Math.abs(now - timestamp) > 60000) { // 1 minute tolerance
      return NextResponse.json(
        { error: 'Invalid or expired timestamp' },
        { status: 400 }
      );
    }

    // Generate user ID from session (in production, this would come from session auth)
    const userId = generateUserId(sessionId);

    // Determine permissions based on authentication type
    const permissions = bridgeAuth
      ? ['terminal', 'files', 'bridge', 'claude-cli']
      : ['terminal', 'files'];

    // Generate authentication ticket
    const ticket = wsAuthManager.generateTicket(
      userId,
      sessionId,
      bridgeAuth,
      permissions
    );

    console.log('🎫 WebSocket ticket generated for client:', {
      sessionId,
      bridgeAuth,
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

/**
 * Generate user ID from session ID
 * In production, this would use proper session management
 */
function generateUserId(sessionId: string): string {
  // For alpha, use a hash of the session ID as user ID
  // In production, this would look up the actual user from session
  return crypto
    .createHash('sha256')
    .update(sessionId)
    .digest('hex')
    .substring(0, 16);
}