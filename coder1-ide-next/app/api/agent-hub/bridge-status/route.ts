// app/api/agent-hub/bridge-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/agent-hub/auth';

interface BridgeInfo {
  id: string;
  connectedAt: string;
  platform: string;
  version: string;
}

interface BridgeManager {
  findAnyConnectedBridge(): {
    id: string;
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
  const manager = g['bridgeManager'] as BridgeManager | undefined;

  if (!manager) {
    return NextResponse.json({ connected: false, bridge: null });
  }

  try {
    const bridge = manager.findAnyConnectedBridge();
    if (!bridge) {
      return NextResponse.json({ connected: false, bridge: null });
    }

    const info: BridgeInfo = {
      id: bridge.id,
      connectedAt: bridge.connectedAt.toISOString(),
      platform: bridge.platform,
      version: bridge.version,
    };

    return NextResponse.json({ connected: true, bridge: info });
  } catch (err: unknown) {
    console.error('[bridge-status] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
