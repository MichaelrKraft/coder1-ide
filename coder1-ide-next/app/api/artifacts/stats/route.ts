import { NextRequest, NextResponse } from 'next/server';
import { artifactsService } from '@/services/artifacts-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/artifacts/stats
 * Get summary statistics for all artifacts
 *
 * Returns:
 * - total: Total number of artifacts
 * - byType: Count breakdown by artifact type
 * - totalSize: Total storage size in bytes
 * - averageSize: Average artifact size
 * - lastCreated: Most recent artifact creation date
 */
export async function GET(request: NextRequest) {
  try {
    const stats = artifactsService.getArtifactStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Artifacts Stats API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve artifact statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
