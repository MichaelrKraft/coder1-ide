import { NextRequest, NextResponse } from 'next/server';
import { artifactsService } from '@/services/artifacts-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/artifacts/inbox
 * Get inbox (pending) and saved artifacts
 */
export async function GET() {
  try {
    const inbox = artifactsService.getInbox();
    const saved = artifactsService.getSaved();
    const stats = artifactsService.getInboxStats();

    return NextResponse.json({
      success: true,
      inbox,
      saved,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [Artifacts Inbox API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve inbox' },
      { status: 500 }
    );
  }
}
