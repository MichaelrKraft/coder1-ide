/**
 * Generate Pairing Code API Endpoint
 * Creates a new pairing code for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { bridgeManager } from '@/services/bridge-manager';

export async function POST(request: NextRequest) {
  try {
    // In production, get userId from session/auth
    // For now, we'll use a test user ID or get from request
    const { userId } = await request.json().catch(() => ({ userId: null }));
    
    // Default to a session-based ID if no userId provided
    const actualUserId = userId || `user_${Date.now()}`;
    
    // Generate pairing code
    const code = bridgeManager.generatePairingCode(actualUserId);
    
    console.log(`[Bridge API] Generated pairing code for user ${actualUserId}: ${code}`);

    return NextResponse.json({
      success: true,
      code,
      expiresIn: 300, // 5 minutes in seconds
      userId: actualUserId
    });
  } catch (error) {
    console.error('[Bridge API] Generate code error:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate pairing code' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // GET endpoint to check if user has active bridge
  try {
    // Get userId from query params or session
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || `user_default`;
    
    const status = bridgeManager.getBridgeStatus(userId);
    
    return NextResponse.json({
      ...status,
      userId
    });
  } catch (error) {
    console.error('[Bridge API] Status check error:', error);
    
    return NextResponse.json(
      { error: 'Failed to check bridge status' },
      { status: 500 }
    );
  }
}