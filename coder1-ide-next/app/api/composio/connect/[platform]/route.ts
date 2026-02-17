/**
 * Composio Connect Route
 *
 * POST /api/composio/connect/[platform]
 * Initiates OAuth flow for a deployment platform (render, vercel, supabase).
 * Returns the OAuth authorization URL the client should redirect to.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getComposioService, ComposioServiceError } from '@/services/composio';
import type { ComposioPlatform } from '@/services/composio';
import { extractUserId } from '@/lib/auth/extract-user-id';

export const dynamic = 'force-dynamic';

const VALID_PLATFORMS: ComposioPlatform[] = ['render', 'vercel', 'supabase'];

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } },
) {
  try {
    const platform = params.platform as ComposioPlatform;

    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { success: false, error: `Unsupported platform: ${platform}` },
        { status: 400 },
      );
    }

    const userId = extractUserId(request);
    const service = getComposioService();

    // First check if already connected
    const status = await service.getConnectionStatus(userId, platform);
    if (status.connected) {
      return NextResponse.json({
        success: true,
        alreadyConnected: true,
        data: {
          platform,
          status: 'connected',
          connectedAt: status.connectedAt,
        },
      });
    }

    // Try to get OAuth URL for platforms that support it
    try {
      const oauthUrl = await service.getOAuthUrl(userId, platform);

      if (!oauthUrl) {
        return NextResponse.json(
          { success: false, error: 'Failed to generate OAuth URL.' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: { url: oauthUrl, platform },
      });
    } catch (oauthErr) {
      // If OAuth initiation fails, check if there's an active connection in Composio
      // (might be connected globally but not tracked in our DB)
      const globalStatus = await service.checkGlobalConnection(platform);
      if (globalStatus.connected) {
        return NextResponse.json({
          success: true,
          alreadyConnected: true,
          data: {
            platform,
            status: 'connected',
            message: 'Connected via Composio dashboard',
          },
        });
      }
      throw oauthErr;
    }
  } catch (err) {
    if (err instanceof ComposioServiceError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: 400 },
      );
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Composio Connect] Unexpected error:', errorMessage);

    // Provide helpful error messages for common Composio issues
    if (errorMessage.includes('Bad Request') || errorMessage.includes('Missing required fields')) {
      // Render uses API key auth, not OAuth - must be connected in Composio dashboard
      return NextResponse.json(
        {
          success: false,
          error: `${params.platform} requires API key authentication. Please connect it directly at app.composio.dev/apps → ${params.platform} → Connect, and enter your API key there.`,
          code: 'API_KEY_AUTH_REQUIRED',
          helpUrl: 'https://app.composio.dev/apps',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
