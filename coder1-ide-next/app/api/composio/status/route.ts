/**
 * Composio Status Route
 *
 * GET /api/composio/status?platform=render
 * GET /api/composio/status (returns all platforms)
 *
 * Returns the connection status for one or all deployment platforms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getComposioService, ComposioServiceError } from '@/services/composio';
import type { ComposioPlatform, ConnectionStatus } from '@/services/composio';
import { extractUserId } from '@/lib/auth/extract-user-id';

export const dynamic = 'force-dynamic';

const ALL_PLATFORMS: ComposioPlatform[] = ['render', 'vercel', 'supabase'];

/**
 * Get status for a single platform, checking both local DB and Composio global connections.
 */
async function getFullStatus(
  service: ReturnType<typeof getComposioService>,
  userId: string,
  platform: ComposioPlatform,
): Promise<ConnectionStatus> {
  // First check local DB
  const localStatus = await service.getConnectionStatus(userId, platform);

  // If already connected in local DB, return that
  if (localStatus.connected) {
    return localStatus;
  }

  // If not in local DB, check Composio global connections
  // (handles connections made directly in Composio dashboard)
  const globalStatus = await service.checkGlobalConnection(platform);

  if (globalStatus.connected) {
    return {
      platform,
      connected: true,
      status: 'connected',
      connectedAt: undefined, // Unknown - connected via Composio dashboard
      lastUsedAt: undefined,
    };
  }

  // Not connected anywhere
  return localStatus;
}

export async function GET(request: NextRequest) {
  try {
    const userId = extractUserId(request);
    const platform = request.nextUrl.searchParams.get('platform') as ComposioPlatform | null;
    const service = getComposioService();

    if (platform) {
      if (!ALL_PLATFORMS.includes(platform)) {
        return NextResponse.json(
          { success: false, error: `Unknown platform: ${platform}` },
          { status: 400 },
        );
      }

      const status = await getFullStatus(service, userId, platform);
      return NextResponse.json({ success: true, data: status });
    }

    // Return status for all platforms
    const statuses: ConnectionStatus[] = await Promise.all(
      ALL_PLATFORMS.map((p) => getFullStatus(service, userId, p)),
    );

    return NextResponse.json({ success: true, data: statuses });
  } catch (err) {
    if (err instanceof ComposioServiceError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: 400 },
      );
    }

    console.error('[Composio Status] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/composio/status?platform=render
 * Disconnect a platform.
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = extractUserId(request);
    const platform = request.nextUrl.searchParams.get('platform') as ComposioPlatform | null;

    if (!platform || !ALL_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { success: false, error: 'Platform query parameter is required.' },
        { status: 400 },
      );
    }

    const service = getComposioService();
    await service.disconnect(userId, platform);

    return NextResponse.json({ success: true, data: { platform, disconnected: true } });
  } catch (err) {
    console.error('[Composio Status] Delete error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect.' },
      { status: 500 },
    );
  }
}
