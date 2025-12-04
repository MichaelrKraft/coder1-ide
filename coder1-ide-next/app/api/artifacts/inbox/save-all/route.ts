import { NextRequest, NextResponse } from 'next/server';
import { artifactsService } from '@/services/artifacts-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/artifacts/inbox/save-all
 * Save all pending artifacts at once
 */
export async function POST() {
  try {
    const count = artifactsService.saveAll();

    return NextResponse.json({
      success: true,
      savedCount: count,
      message: `Saved ${count} artifact(s)`
    });
  } catch (error) {
    console.error('❌ [Artifacts Inbox API] save-all error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save all artifacts' },
      { status: 500 }
    );
  }
}
