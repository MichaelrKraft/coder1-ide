import { NextRequest, NextResponse } from 'next/server';
import { artifactsService } from '@/services/artifacts-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/artifacts/[id]/save
 * Save a specific artifact (move from inbox to saved)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const artifact = artifactsService.saveArtifact(id);

    if (!artifact) {
      return NextResponse.json(
        { success: false, error: 'Artifact not found or already saved' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      artifact,
      message: 'Artifact saved successfully'
    });
  } catch (error) {
    console.error('❌ [Artifacts API] save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save artifact' },
      { status: 500 }
    );
  }
}
