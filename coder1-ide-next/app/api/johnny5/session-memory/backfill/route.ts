/**
 * Johnny5 Session Memory Backfill API
 *
 * POST /api/johnny5/session-memory/backfill
 *
 * Scans existing checkpoint data and indexes it into memory_chunks
 * for session recall. This is a one-time operation for users who
 * already have checkpoint data before the session memory feature.
 *
 * Rate-limited: processes 5 checkpoints per second to avoid overwhelming DB.
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { indexSessionFromCheckpoint, type CheckpointData } from '@/services/memory/session-indexer';

// Simple in-memory lock to prevent concurrent backfills
let backfillInProgress = false;

/**
 * Get the data directory for session storage
 */
function getDataDirectory(): string {
  return path.join(process.cwd(), 'data');
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST() {
  if (backfillInProgress) {
    return NextResponse.json(
      { error: 'Backfill already in progress' },
      { status: 409 }
    );
  }

  backfillInProgress = true;

  try {
    const dataDir = getDataDirectory();
    const sessionsDir = path.join(dataDir, 'sessions');

    // Check if sessions directory exists
    try {
      await fs.access(sessionsDir);
    } catch {
      backfillInProgress = false;
      return NextResponse.json({
        success: true,
        total: 0,
        indexed: 0,
        skipped: 0,
        errors: 0,
        message: 'No sessions directory found',
      });
    }

    // Scan all session directories
    const sessionDirs = await fs.readdir(sessionsDir);
    const sessionFolders = sessionDirs.filter(d => d.startsWith('session_'));

    let total = 0;
    let indexed = 0;
    let skipped = 0;
    let errors = 0;

    for (const sessionFolder of sessionFolders) {
      const checkpointsBaseDir = path.join(sessionsDir, sessionFolder, 'checkpoints');

      // Collect checkpoint files from all subdirectories (manual/, auto/, and legacy root)
      const checkpointFiles: string[] = [];

      try {
        const subdirs = await fs.readdir(checkpointsBaseDir);
        for (const subdir of subdirs) {
          const subdirPath = path.join(checkpointsBaseDir, subdir);
          const stat = await fs.stat(subdirPath);

          if (stat.isDirectory()) {
            // Read checkpoint files from subdirectory
            const files = await fs.readdir(subdirPath);
            for (const file of files) {
              if (file.endsWith('.json')) {
                checkpointFiles.push(path.join(subdirPath, file));
              }
            }
          } else if (subdir.endsWith('.json')) {
            // Legacy root-level checkpoint file
            checkpointFiles.push(subdirPath);
          }
        }
      } catch {
        // No checkpoints directory for this session
        continue;
      }

      // Process each checkpoint file (rate limited: 5 per second)
      for (const checkpointPath of checkpointFiles) {
        total++;

        try {
          const raw = await fs.readFile(checkpointPath, 'utf8');
          const checkpoint = JSON.parse(raw) as CheckpointData;

          const sessionId = checkpoint.sessionId || sessionFolder;
          const result = await indexSessionFromCheckpoint(checkpoint, sessionId, 'default');

          indexed += result.chunksIndexed;
          skipped += result.skipped;

          // Rate limit: 5 checkpoints per second (200ms between each)
          await sleep(200);
        } catch (err) {
          errors++;
          console.error(`[SessionMemory/Backfill] Error processing ${checkpointPath}:`, err);
        }
      }
    }

    console.log(`[SessionMemory/Backfill] Complete: ${total} checkpoints processed, ${indexed} chunks indexed, ${skipped} skipped, ${errors} errors`);

    return NextResponse.json({
      success: true,
      total,
      indexed,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('[SessionMemory/Backfill] Fatal error:', error);
    return NextResponse.json(
      { error: 'Backfill failed' },
      { status: 500 }
    );
  } finally {
    backfillInProgress = false;
  }
}
