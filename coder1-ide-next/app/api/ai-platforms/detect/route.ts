/**
 * GET /api/ai-platforms/detect
 *
 * Server-side CLI platform detection. Returns real results from
 * CLIDetector.detectAll() instead of the client-side mock.
 */

import { NextResponse } from 'next/server';
import { cliDetector } from '@/services/ai-platform/cli-detector';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await cliDetector.detectAll();

    return NextResponse.json({
      success: true,
      platforms: result.platforms,
      primary: result.primary,
      timestamp: result.timestamp.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to detect AI platforms' },
      { status: 500 }
    );
  }
}
