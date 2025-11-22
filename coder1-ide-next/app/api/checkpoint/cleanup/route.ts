import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

/**
 * Cleanup API for Auto-Checkpoints
 * 
 * Retention Policy:
 * - Keep last 50 auto-checkpoints per session
 * - Delete auto-checkpoints older than 7 days
 * - NEVER delete manual checkpoints
 */

const MAX_AUTO_CHECKPOINTS = 50;
const MAX_AGE_DAYS = 7;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

interface CheckpointFile {
  name: string;
  path: string;
  timestamp: number;
}

/**
 * Extract timestamp from checkpoint filename
 * Format: checkpoint_{timestamp}_{random}.json
 */
function extractTimestamp(filename: string): number {
  const match = filename.match(/checkpoint_(\d+)_/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Cleanup auto-checkpoints for a specific session
 */
async function cleanupSession(sessionId: string): Promise<{
  deleted: number;
  kept: number;
  errors: string[];
}> {
  const autoCheckpointsDir = path.join(
    process.cwd(),
    'data',
    'sessions',
    sessionId,
    'checkpoints',
    'auto'
  );

  const result = {
    deleted: 0,
    kept: 0,
    errors: [] as string[]
  };

  try {
    // Check if auto directory exists
    await fs.access(autoCheckpointsDir);
  } catch {
    // No auto checkpoints directory, nothing to clean
    return result;
  }

  try {
    // Read all auto checkpoint files
    const files = await fs.readdir(autoCheckpointsDir);
    const checkpointFiles: CheckpointFile[] = files
      .filter(f => f.endsWith('.json') && f.startsWith('checkpoint_'))
      .map(name => ({
        name,
        path: path.join(autoCheckpointsDir, name),
        timestamp: extractTimestamp(name)
      }));

    if (checkpointFiles.length === 0) {
      return result;
    }

    // Sort by timestamp (newest first)
    checkpointFiles.sort((a, b) => b.timestamp - a.timestamp);

    const now = Date.now();
    const cutoffTime = now - MAX_AGE_MS;

    // Determine which files to delete
    const filesToDelete: CheckpointFile[] = [];

    for (let i = 0; i < checkpointFiles.length; i++) {
      const file = checkpointFiles[i];

      // Keep if within top 50 AND not too old
      if (i < MAX_AUTO_CHECKPOINTS && file.timestamp > cutoffTime) {
        result.kept++;
        continue;
      }

      // Delete if outside top 50 OR too old
      filesToDelete.push(file);
    }

    // Delete files
    for (const file of filesToDelete) {
      try {
        await fs.unlink(file.path);
        result.deleted++;
      } catch (error) {
        result.errors.push(`Failed to delete ${file.name}: ${(error as Error).message}`);
      }
    }

    if (result.deleted > 0) {
      console.log(`🧹 Cleanup for session ${sessionId}: deleted ${result.deleted}, kept ${result.kept}`);
    }
  } catch (error) {
    result.errors.push(`Failed to cleanup session ${sessionId}: ${(error as Error).message}`);
  }

  return result;
}

/**
 * POST /api/checkpoint/cleanup
 * Clean up old auto-checkpoints for specific session or all sessions
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, allSessions } = await request.json();

    if (sessionId) {
      // Clean up specific session
      const result = await cleanupSession(sessionId);
      
      return NextResponse.json({
        success: true,
        sessionId,
        ...result
      });
    }

    if (allSessions) {
      // Clean up all sessions
      const sessionsDir = path.join(process.cwd(), 'data', 'sessions');
      
      try {
        const sessions = await fs.readdir(sessionsDir);
        const results: any[] = [];

        for (const session of sessions) {
          const result = await cleanupSession(session);
          if (result.deleted > 0 || result.errors.length > 0) {
            results.push({
              sessionId: session,
              ...result
            });
          }
        }

        const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
        const totalKept = results.reduce((sum, r) => sum + r.kept, 0);

        return NextResponse.json({
          success: true,
          sessions: results.length,
          totalDeleted,
          totalKept,
          results
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to read sessions directory' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Must provide sessionId or allSessions=true' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Cleanup API error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup checkpoints' },
      { status: 500 }
    );
  }
}
