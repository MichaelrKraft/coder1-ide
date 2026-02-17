/**
 * Composio OAuth Callback Route
 *
 * GET /api/composio/callback
 * Handles the OAuth redirect from the deployment platform.
 * Stores the connection and redirects back to the settings page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getComposioService, ComposioServiceError } from '@/services/composio';
import type { ComposioPlatform } from '@/services/composio';

export const dynamic = 'force-dynamic';

const VALID_PLATFORMS: ComposioPlatform[] = ['render', 'vercel', 'supabase'];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Composio typically passes these in the callback
  const composioAccountId = searchParams.get('connected_account_id') ?? searchParams.get('connectedAccountId');
  const platform = searchParams.get('platform') as ComposioPlatform | null;
  const userId = searchParams.get('user_id') ?? searchParams.get('entityId') ?? 'default';
  const status = searchParams.get('status');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
  const settingsUrl = `${appUrl}/ide?tab=settings&section=integrations`;

  // If Composio reports failure, redirect with error
  if (status === 'failed' || status === 'error') {
    const reason = searchParams.get('error') ?? 'Authorization was denied or failed.';
    return NextResponse.redirect(
      `${settingsUrl}&composio_error=${encodeURIComponent(reason)}`,
    );
  }

  if (!composioAccountId) {
    return NextResponse.redirect(
      `${settingsUrl}&composio_error=${encodeURIComponent('Missing account ID in callback.')}`,
    );
  }

  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    // Try to infer platform from other params
    const inferredPlatform = searchParams.get('app') as ComposioPlatform | null;
    const finalPlatform = inferredPlatform && VALID_PLATFORMS.includes(inferredPlatform)
      ? inferredPlatform
      : 'render'; // Default to render for Phase 1

    try {
      const service = getComposioService();
      await service.handleOAuthCallback(composioAccountId, userId, finalPlatform);

      return NextResponse.redirect(
        `${settingsUrl}&composio_connected=${finalPlatform}`,
      );
    } catch (err) {
      const message = err instanceof ComposioServiceError ? err.message : 'Callback processing failed.';
      console.error('[Composio Callback] Error:', err);
      return NextResponse.redirect(
        `${settingsUrl}&composio_error=${encodeURIComponent(message)}`,
      );
    }
  }

  try {
    const service = getComposioService();
    await service.handleOAuthCallback(composioAccountId, userId, platform);

    return NextResponse.redirect(
      `${settingsUrl}&composio_connected=${platform}`,
    );
  } catch (err) {
    const message = err instanceof ComposioServiceError ? err.message : 'Callback processing failed.';
    console.error('[Composio Callback] Error:', err);
    return NextResponse.redirect(
      `${settingsUrl}&composio_error=${encodeURIComponent(message)}`,
    );
  }
}
