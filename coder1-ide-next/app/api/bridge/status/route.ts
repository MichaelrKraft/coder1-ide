import { NextRequest, NextResponse } from 'next/server';

// Import active bridges from pair endpoint
import { activeBridges } from '../pair/route';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ 
      error: 'User ID required' 
    }, { status: 400 });
  }

  // Check if user has an active bridge
  let userBridge = null;
  for (const [bridgeId, bridge] of activeBridges.entries()) {
    if (bridge.userId === userId) {
      userBridge = bridge;
      break;
    }
  }

  if (userBridge) {
    return NextResponse.json({
      connected: true,
      bridgeId: userBridge.bridgeId,
      connectedAt: userBridge.connectedAt,
      platform: userBridge.platform,
      claudeVersion: userBridge.claudeVersion
    });
  }

  return NextResponse.json({
    connected: false
  });
}