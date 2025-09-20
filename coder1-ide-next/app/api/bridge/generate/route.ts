/**
 * Bridge Pairing Code Generation API
 * Generates a 6-digit pairing code for connecting the bridge CLI
 */

import { NextRequest, NextResponse } from 'next/server';
import { bridgeManager } from '@/services/bridge-manager';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Generate a new pairing code
    const code = bridgeManager.generatePairingCode(userId);
    
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

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate a pairing code.' },
    { status: 405 }
  );
}