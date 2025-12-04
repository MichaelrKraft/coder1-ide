import { NextRequest, NextResponse } from 'next/server';
import { artifactsService } from '@/services/artifacts-service';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/artifacts/inbox/delete-all
 * Delete all pending artifacts at once
 */
export async function DELETE() {
  try {
    const count = artifactsService.deleteAllPending();

    return NextResponse.json({
      success: true,
      deletedCount: count,
      message: `Deleted ${count} artifact(s)`
    });
  } catch (error) {
    console.error('❌ [Artifacts Inbox API] delete-all error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete all artifacts' },
      { status: 500 }
    );
  }
}
