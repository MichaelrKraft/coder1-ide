import { NextRequest, NextResponse } from 'next/server';
import { artifactsService } from '@/services/artifacts-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/artifacts/[id]
 * Get a specific artifact by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Artifact ID is required'
        },
        { status: 400 }
      );
    }

    const artifact = artifactsService.getArtifact(id);

    if (!artifact) {
      return NextResponse.json(
        {
          success: false,
          error: 'Artifact not found',
          id
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      artifact,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Artifacts API] GET [id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve artifact',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/artifacts/[id]
 * Delete a specific artifact by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Artifact ID is required'
        },
        { status: 400 }
      );
    }

    // Check if artifact exists before deleting
    const artifact = artifactsService.getArtifact(id);
    if (!artifact) {
      return NextResponse.json(
        {
          success: false,
          error: 'Artifact not found',
          id
        },
        { status: 404 }
      );
    }

    // Delete the artifact
    const deleted = artifactsService.deleteArtifact(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete artifact',
          id
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Artifact deleted successfully',
      id,
      deletedArtifact: artifact,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Artifacts API] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete artifact',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
