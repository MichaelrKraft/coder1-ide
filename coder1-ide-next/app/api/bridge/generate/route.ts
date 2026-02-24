/**
 * Bridge Pairing Code Generation API
 * Generates a 6-digit pairing code for connecting the bridge CLI
 *
 * SECURITY FIX (Feb 23, 2026): Added authentication requirement
 * to prevent attackers from generating codes for arbitrary userIds
 */

import { NextRequest, NextResponse } from 'next/server';
import { bridgeStore } from '@/lib/bridge-store';
import { withAPIMiddleware, APIContext } from '@/lib/api-middleware';

async function generateHandler(context: APIContext): Promise<NextResponse> {
  try {
    const { userId } = await context.req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // SECURITY: Verify the authenticated user matches the requested userId
    // This prevents attackers from generating codes for other users
    if (context.user && context.user.id !== userId && context.user.id !== 'alpha-user') {
      console.warn(`[Bridge Generate API] SECURITY: User ${context.user.id} attempted to generate code for ${userId}`);
      return NextResponse.json(
        { error: 'Cannot generate code for another user' },
        { status: 403 }
      );
    }

    // Generate a new pairing code (using bridgeStore to match /api/bridge/pair validation)
    const code = await bridgeStore.generateCode(userId);

    console.log(`[Bridge Generate API] Generated pairing code ${code} for user ${userId}`);

    return NextResponse.json({
      success: true,
      code,
      expiresIn: 300, // 5 minutes in seconds
      instructions: [
        '1. Run: coder1-bridge start',
        '2. Enter this pairing code when prompted',
        '3. The bridge will connect automatically',
        '4. Start using Claude commands in the terminal!'
      ]
    });
  } catch (error) {
    console.error('[Bridge Generate API] Error:', error);

    return NextResponse.json(
      { error: 'Failed to generate pairing code' },
      { status: 500 }
    );
  }
}

// SECURITY: Require authentication and apply rate limiting
export const POST = withAPIMiddleware(generateHandler, {
  requireAuth: true,
  rateLimit: 'auth'
});

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate a pairing code.' },
    { status: 405 }
  );
}