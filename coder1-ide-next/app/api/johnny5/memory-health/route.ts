/**
 * Johnny5 Memory Health Check API
 *
 * GET /api/johnny5/memory-health
 *
 * Returns diagnostic information about the Johnny5 memory system.
 * Use this endpoint to verify memory is working correctly.
 */

import { NextResponse } from 'next/server';
import { getMemoryStats, isVectorSearchAvailable, isSqliteVecLoaded, getDb } from '@/lib/johnny5-db';
import { JOHNNY5_DB_PATH } from '@/lib/data-paths';
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
  vectorSearch: {
    available: boolean;
    sqliteVecLoaded: boolean;
    reason: string | null;
  };
  embeddingService: {
    configured: boolean;
    provider: string;
  };
  factExtraction: {
    enabled: boolean;
    factCount: number;
    lastExtraction: string | null;
  };
  envVars: {
    GEMINI_API_KEY: boolean;
    OPENAI_API_KEY: boolean;
    ENABLE_ETERNAL_MEMORY: string | null;
    NEXT_PUBLIC_MEMORY_CONTEXT_ENABLED: string | null;
    NEXT_PUBLIC_MEMORY_AUTO_INJECT: string | null;
  };
  database: {
    path: string;
    integrityCheck: string;
    sessionCount: number;
    messageCount: number;
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

    // Vector search diagnostics
    const vectorAvailable = isVectorSearchAvailable();
    const vecLoaded = isSqliteVecLoaded();
    let vectorReason: string | null = null;
    if (!vectorAvailable) {
      vectorReason = !vecLoaded
        ? 'sqlite-vec extension not installed'
        : 'vector table creation failed';
    }

    // Embedding service diagnostics
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    const embeddingConfigured = hasGeminiKey || hasOpenAIKey;
    const embeddingProvider = hasGeminiKey ? 'gemini' : hasOpenAIKey ? 'openai' : 'none';

    // Fact extraction diagnostics
    const factExtractionEnabled = hasGeminiKey;
    let factCount = 0;
    let lastExtraction: string | null = null;
    try {
      const database = getDb();
      const factCountResult = database.prepare('SELECT COUNT(*) as count FROM extracted_facts').get() as { count: number };
      factCount = factCountResult.count;
      const lastExtractionResult = database.prepare('SELECT MAX(created_at) as last FROM extracted_facts').get() as { last: string | null };
      lastExtraction = lastExtractionResult.last;
    } catch {
      // Table may not exist or DB may be inaccessible -- report zeros
    }

    // Database diagnostics
    let integrityCheck = 'ok';
    let sessionCount = 0;
    let messageCount = 0;
    try {
      const database = getDb();
      const integrityResult = database.prepare('PRAGMA integrity_check(1)').get() as { integrity_check: string };
      integrityCheck = integrityResult.integrity_check;
      sessionCount = (database.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number }).count;
      messageCount = (database.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number }).count;
    } catch (err) {
      integrityCheck = err instanceof Error ? err.message : 'unknown error';
    }

    // Determine health status
    const hasMemoryChunks = stats.total_chunks > 0;
    const hasManusLiveFiles = manusLive.memoryFileExists || manusLive.userFileExists;
    const dbAccessible = integrityCheck === 'ok';
    const isHealthy = dbAccessible && (factExtractionEnabled || hasMemoryChunks);

    // Build recommendations based on issues found
    const recommendations: string[] = [];

    if (!dbAccessible) {
      recommendations.push(`Database integrity check failed: ${integrityCheck}`);
    }

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

    if (!embeddingConfigured) {
      recommendations.push('No embedding API key configured. Set GEMINI_API_KEY or OPENAI_API_KEY for semantic search.');
    }

    if (!factExtractionEnabled) {
      recommendations.push('Fact extraction disabled. Set GEMINI_API_KEY to enable automatic fact extraction from conversations.');
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
      vectorSearch: {
        available: vectorAvailable,
        sqliteVecLoaded: vecLoaded,
        reason: vectorReason,
      },
      embeddingService: {
        configured: embeddingConfigured,
        provider: embeddingProvider,
      },
      factExtraction: {
        enabled: factExtractionEnabled,
        factCount,
        lastExtraction,
      },
      envVars: {
        GEMINI_API_KEY: hasGeminiKey,
        OPENAI_API_KEY: hasOpenAIKey,
        ENABLE_ETERNAL_MEMORY: process.env.ENABLE_ETERNAL_MEMORY ?? null,
        NEXT_PUBLIC_MEMORY_CONTEXT_ENABLED: process.env.NEXT_PUBLIC_MEMORY_CONTEXT_ENABLED ?? null,
        NEXT_PUBLIC_MEMORY_AUTO_INJECT: process.env.NEXT_PUBLIC_MEMORY_AUTO_INJECT ?? null,
      },
      database: {
        path: JOHNNY5_DB_PATH,
        integrityCheck,
        sessionCount,
        messageCount,
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
      vectorSearch: {
        available: false,
        sqliteVecLoaded: false,
        reason: 'health check failed',
      },
      embeddingService: {
        configured: false,
        provider: 'none',
      },
      factExtraction: {
        enabled: false,
        factCount: 0,
        lastExtraction: null,
      },
      envVars: {
        GEMINI_API_KEY: false,
        OPENAI_API_KEY: false,
        ENABLE_ETERNAL_MEMORY: null,
        NEXT_PUBLIC_MEMORY_CONTEXT_ENABLED: null,
        NEXT_PUBLIC_MEMORY_AUTO_INJECT: null,
      },
      database: {
        path: JOHNNY5_DB_PATH,
        integrityCheck: `health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sessionCount: 0,
        messageCount: 0,
      },
      diagnostics: {
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendations: ['Check server logs for errors', 'Verify database is accessible'],
      },
    });
  }
}
