/**
 * Johnny5 Memory Clear Cache API
 *
 * POST /api/johnny5/context/clear-cache
 *
 * Clears all indexed memory chunks and embeddings.
 * Use this to reset the memory index for a fresh start.
 */

import { NextResponse } from 'next/server';
import { clearAllMemoryChunks, getMemoryStats } from '@/lib/johnny5-db';
import { clearManusLiveIndex, clearSessionIndex } from '@/services/memory';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export async function POST() {
  try {
    // Get stats before clearing
    const statsBefore = await getMemoryStats();
    const chunksDeleted = statsBefore.total_chunks;

    // Clear all sources
    await Promise.all([
      clearManusLiveIndex(),
      clearSessionIndex(),
    ]);

    // Clear database chunks and embeddings
    await clearAllMemoryChunks();

    return NextResponse.json({
      success: true,
      data: {
        chunksDeleted,
        message: `Cleared ${chunksDeleted} memory chunks`,
      },
      timestamp: new Date(),
    } as APIResponse<{ chunksDeleted: number; message: string }>);

  } catch (error) {
    console.error('[Memory Clear] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Clear failed',
        timestamp: new Date(),
      } as APIResponse<null>,
      { status: 500 }
    );
  }
}

// Info endpoint
export async function GET() {
  const stats = await getMemoryStats();

  return NextResponse.json({
    success: true,
    data: {
      endpoint: '/api/johnny5/context/clear-cache',
      method: 'POST',
      description: 'Clears all indexed memory chunks and embeddings',
      warning: 'This operation is irreversible - all indexed memories will be deleted',
      currentStats: {
        totalChunks: stats.total_chunks,
        manusLiveChunks: stats.manuslive_chunks,
        sessionChunks: stats.session_chunks,
      },
    },
    timestamp: new Date(),
  });
}
