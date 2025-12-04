import { NextRequest, NextResponse } from 'next/server';
import { artifactsService } from '@/services/artifacts-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/artifacts/[id]/content
 * Get the actual content of an artifact
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

    // First check if artifact exists
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

    // Get the content
    const content = artifactsService.getArtifactContent(id);

    if (content === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Artifact content not found',
          id,
          message: 'Content may not have been saved to disk'
        },
        { status: 404 }
      );
    }

    // Determine content type from artifact metadata
    const contentType = artifact.metadata?.mimeType || 'text/plain';

    // For code/text content, return JSON with the content
    if (contentType.startsWith('text/') || contentType === 'application/json') {
      return NextResponse.json({
        success: true,
        artifact: {
          id: artifact.id,
          name: artifact.name,
          type: artifact.type,
          mimeType: contentType
        },
        content,
        timestamp: new Date().toISOString()
      });
    }

    // For binary content, return raw response with appropriate headers
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${artifact.name}"`
      }
    });

  } catch (error) {
    console.error('❌ [Artifacts API] GET content error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve artifact content',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
