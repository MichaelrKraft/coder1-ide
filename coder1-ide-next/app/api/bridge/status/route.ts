import { NextRequest, NextResponse } from 'next/server';
import { bridgeManager } from '@/services/bridge-manager';

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

  // FIX (Jan 27, 2026): Check actual WebSocket connection via bridgeManager
  // The activeBridges map only tracks JWT validation, not actual WebSocket connection

  // First, try to get bridge status from bridgeManager (actual WebSocket connections)
  const bridgeStatus = bridgeManager?.getBridgeStatus?.(userId);

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
  const anyBridge = bridgeManager?.findAnyConnectedBridge?.();

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
