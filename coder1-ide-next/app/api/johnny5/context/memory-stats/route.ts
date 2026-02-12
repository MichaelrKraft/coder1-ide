/**
 * Johnny5 Memory Stats API
 *
 * GET /api/johnny5/context/memory-stats
 *
 * Returns statistics about the memory index including
 * chunk counts, last indexed time, and embedding model info.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMemoryStats } from '@/lib/johnny5-db';
import { isWatcherRunning } from '@/services/memory';
import { extractUserId } from '@/lib/auth/extract-user-id';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export async function GET(request: NextRequest) {
  try {
    const userId = extractUserId(request);

    const stats = await getMemoryStats(userId);
    const watcherRunning = isWatcherRunning();

    return NextResponse.json({
      success: true,
      data: {
        totalChunks: stats.total_chunks,
        manusLiveChunks: stats.manuslive_chunks,
        sessionChunks: stats.session_chunks,
        lastIndexed: stats.last_indexed,
        embeddingModel: stats.embedding_model,
        watcherRunning,
      },
      timestamp: new Date(),
    } as APIResponse<{
      totalChunks: number;
      manusLiveChunks: number;
      sessionChunks: number;
      lastIndexed: string | null;
      embeddingModel: string | null;
      watcherRunning: boolean;
    }>);

  } catch (error) {
    console.error('[Memory Stats] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get memory stats',
        timestamp: new Date(),
      } as APIResponse<null>,
      { status: 500 }
    );
  }
}
