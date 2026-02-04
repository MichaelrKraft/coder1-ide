/**
 * Johnny5 Memory Rebuild Index API
 *
 * POST /api/johnny5/context/rebuild-index
 *
 * Triggers a full reindex of all memory sources:
 * - ManusLive MEMORY.md and USER.md
 * - Session messages from johnny5.db
 */

import { NextResponse } from 'next/server';
import {
  indexAllManusLive,
  indexAllSessions,
} from '@/services/memory';
import { getMemoryStats } from '@/lib/johnny5-db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

interface RebuildResult {
  manusLiveChunks: number;
  sessionChunks: number;
  totalTime: number;
  embeddingModel: string | null;
}

export async function POST() {
  const startTime = Date.now();

  try {
    // Run indexing in parallel (these functions take optional progress callbacks)
    const [manusLiveResult, sessionResult] = await Promise.all([
      indexAllManusLive(),
      indexAllSessions(),
    ]);

    const totalTime = Date.now() - startTime;

    // Get updated stats
    const stats = await getMemoryStats();

    // manusLiveResult is { memory, user, totalChunks, totalSkipped }
    // sessionResult is a number (total chunks indexed)
    const manusLiveChunks = typeof manusLiveResult === 'number'
      ? manusLiveResult
      : (manusLiveResult?.totalChunks ?? 0);
    const sessionChunks = typeof sessionResult === 'number'
      ? sessionResult
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        manusLiveChunks,
        sessionChunks,
        totalChunks: stats.total_chunks,
        totalTime,
        embeddingModel: stats.embedding_model,
        message: `Indexed ${manusLiveChunks + sessionChunks} chunks in ${totalTime}ms`,
      },
      timestamp: new Date(),
    } as APIResponse<RebuildResult & { totalChunks: number; message: string }>);

  } catch (error) {
    console.error('[Memory Rebuild] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Rebuild failed',
        timestamp: new Date(),
      } as APIResponse<null>,
      { status: 500 }
    );
  }
}

// Info endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      endpoint: '/api/johnny5/context/rebuild-index',
      method: 'POST',
      description: 'Triggers a full reindex of all memory sources (ManusLive + sessions)',
      warning: 'This operation may take several seconds depending on the amount of content',
    },
    timestamp: new Date(),
  });
}
