// app/api/agent-hub/bridge-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

interface BridgeInfo {
  id: string;
  userId: string;
  connectedAt: string;
  platform: string;
  version: string;
}

interface BridgeManager {
  findAnyConnectedBridge(): {
    id: string;
    userId: string;
    connectedAt: Date;
    platform: string;
    version: string;
  } | null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const g = global as Record<string, unknown>;
  const manager = (g['bridgeManager'] as BridgeManager) ?? null;

  if (!manager) {
    return NextResponse.json({ connected: false, bridge: null });
  }

  const bridge = manager.findAnyConnectedBridge();
  if (!bridge) {
    return NextResponse.json({ connected: false, bridge: null });
  }

  const info: BridgeInfo = {
    id: bridge.id,
    userId: bridge.userId,
    connectedAt: bridge.connectedAt.toISOString(),
    platform: bridge.platform,
    version: bridge.version,
  };

  return NextResponse.json({ connected: true, bridge: info });
}
