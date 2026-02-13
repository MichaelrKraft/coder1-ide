import { NextRequest, NextResponse } from 'next/server';

// REMOVED (Feb 2026): activeBridges was causing stale connection status
// Only bridgeManager tracks real WebSocket connections now

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({
      error: 'User ID required'
    }, { status: 400 });
  }

  // FIX (Feb 2026): Use global.bridgeManager set by server.js
  // This ensures we access the same singleton that has actual WebSocket connections
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bridgeManagerGlobal = (global as any).bridgeManager;
  const bridgeStatus = bridgeManagerGlobal?.getBridgeStatus?.(userId);

  if (bridgeStatus?.connected && bridgeStatus.bridges.length > 0) {
    const bridge = bridgeStatus.bridges[0];
    return NextResponse.json({
      connected: true,
      bridgeId: bridge.id,
      connectedAt: bridge.connectedAt,
      platform: bridge.platform,
      claudeVersion: bridge.version
    });
  }

  // Fallback: Check if ANY bridge is connected (alpha fix for userId mismatch)
  const anyBridge = bridgeManagerGlobal?.findAnyConnectedBridge?.();

  if (anyBridge) {
    return NextResponse.json({
      connected: true,
      bridgeId: anyBridge.id,
      connectedAt: anyBridge.connectedAt,
      platform: anyBridge.platform,
      claudeVersion: anyBridge.version,
      note: 'Using fallback bridge (userId mismatch)'
    });
  }

  // REMOVED (Feb 2026): Legacy fallback caused stale "connected" status
  // activeBridges only tracks JWT validation, not actual WebSocket connection
  // This caused "Bridge already connected" when no real connection existed

  return NextResponse.json({
    connected: false
  });
}
