import { NextRequest, NextResponse } from 'next/server';
import { artifactsService } from '@/services/artifacts-service';
import { ArtifactFilter, ArtifactType } from '@/types/mission-control';

export const dynamic = 'force-dynamic';

/**
 * GET /api/artifacts
 * List all artifacts with optional filtering
 *
 * Query Parameters:
 * - type: Filter by artifact type (video|trace|screenshot|document|code)
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - minSize: Minimum size in bytes
 * - maxSize: Maximum size in bytes
 * - testId: Filter by test ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Build filter object from query parameters
    const filter: ArtifactFilter = {};

    const type = searchParams.get('type');
    if (type && isValidArtifactType(type)) {
      filter.type = type as ArtifactType;
    }

    const startDate = searchParams.get('startDate');
    if (startDate) {
      filter.startDate = new Date(startDate);
    }

    const endDate = searchParams.get('endDate');
    if (endDate) {
      filter.endDate = new Date(endDate);
    }

    const minSize = searchParams.get('minSize');
    if (minSize) {
      filter.minSize = parseInt(minSize, 10);
    }

    const maxSize = searchParams.get('maxSize');
    if (maxSize) {
      filter.maxSize = parseInt(maxSize, 10);
    }

    const testId = searchParams.get('testId');
    if (testId) {
      filter.testId = testId;
    }

    // Get filtered artifacts
    const artifacts = artifactsService.listArtifacts(filter);

    return NextResponse.json({
      success: true,
      artifacts,
      count: artifacts.length,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Artifacts API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve artifacts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/artifacts
 * Create a new artifact
 *
 * Body:
 * - type: Artifact type (required)
 * - name: Display name (required)
 * - path: File path or URL (required)
 * - size: Size in bytes (required)
 * - metadata: Optional metadata object
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.name || !body.path || body.size === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          required: ['type', 'name', 'path', 'size']
        },
        { status: 400 }
      );
    }

    // Validate artifact type
    if (!isValidArtifactType(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid artifact type',
          validTypes: ['video', 'trace', 'screenshot', 'document', 'code']
        },
        { status: 400 }
      );
    }

    // Create the artifact
    const artifact = artifactsService.addArtifact({
      type: body.type,
      name: body.name,
      path: body.path,
      size: body.size,
      metadata: body.metadata
    });

    return NextResponse.json({
      success: true,
      artifact,
      message: 'Artifact created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('❌ [Artifacts API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create artifact',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to validate artifact type
 */
function isValidArtifactType(type: string): boolean {
  return ['video', 'trace', 'screenshot', 'document', 'code'].includes(type);
}
