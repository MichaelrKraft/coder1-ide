/**
 * Johnny5 Memory Health Check API
 *
 * GET /api/johnny5/memory-health
 *
 * Returns diagnostic information about the Johnny5 memory system.
 * Use this endpoint to verify memory is working correctly.
 */

import { NextResponse } from 'next/server';
import { getMemoryStats } from '@/lib/johnny5-db';
import { getManusLiveStatus, isWatcherRunning } from '@/services/memory/sources';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface HealthCheckResponse {
  healthy: boolean;
  timestamp: string;
  stats: {
    totalChunks: number;
    manusLiveChunks: number;
    sessionChunks: number;
    lastIndexed: string | null;
  };
  manusLive: {
    directoryExists: boolean;
    memoryFileExists: boolean;
    userFileExists: boolean;
  };
  fileWatcher: {
    running: boolean;
  };
  diagnostics: {
    message: string;
    recommendations: string[];
  };
}

export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  try {
    const stats = await getMemoryStats();
    const manusLive = getManusLiveStatus();
    const watcherRunning = isWatcherRunning();

    // Determine health status
    const hasMemoryChunks = stats.total_chunks > 0;
    const hasManusLiveFiles = manusLive.memoryFileExists || manusLive.userFileExists;
    const isHealthy = hasMemoryChunks || hasManusLiveFiles;

    // Build recommendations based on issues found
    const recommendations: string[] = [];

    if (!hasMemoryChunks && hasManusLiveFiles) {
      recommendations.push('ManusLive files exist but are not indexed. Server may need restart or manual rebuild-index.');
    }

    if (!hasManusLiveFiles) {
      recommendations.push('ManusLive files not found at ~/.manuslive/workspace/. Johnny5 relies on database-only memory.');
    }

    if (!watcherRunning) {
      recommendations.push('File watcher is not running. Changes to ManusLive files will not be auto-indexed.');
    }

    if (stats.manuslive_chunks === 0 && hasManusLiveFiles) {
      recommendations.push('ManusLive files exist but no chunks indexed. Run POST /api/johnny5/context/rebuild-index.');
    }

    return NextResponse.json({
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
      stats: {
        totalChunks: stats.total_chunks,
        manusLiveChunks: stats.manuslive_chunks,
        sessionChunks: stats.session_chunks,
        lastIndexed: stats.last_indexed,
      },
      manusLive: {
        directoryExists: manusLive.directoryExists,
        memoryFileExists: manusLive.memoryFileExists,
        userFileExists: manusLive.userFileExists,
      },
      fileWatcher: {
        running: watcherRunning,
      },
      diagnostics: {
        message: isHealthy
          ? 'Memory system is operational'
          : 'WARNING: Memory system may not be working correctly',
        recommendations,
      },
    });
  } catch (error) {
    console.error('[Memory Health] Check failed:', error);

    return NextResponse.json({
      healthy: false,
      timestamp: new Date().toISOString(),
      stats: {
        totalChunks: 0,
        manusLiveChunks: 0,
        sessionChunks: 0,
        lastIndexed: null,
      },
      manusLive: {
        directoryExists: false,
        memoryFileExists: false,
        userFileExists: false,
      },
      fileWatcher: {
        running: false,
      },
      diagnostics: {
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendations: ['Check server logs for errors', 'Verify database is accessible'],
      },
    });
  }
}
