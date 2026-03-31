/**
 * Session Rescue - Recovery Check API
 * 
 * Detects if a recoverable checkpoint exists from a previous unexpected shutdown.
 * Returns the most recent recoverable checkpoint with health score and metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { isCheckpointRecoverable, calculateRecoveryScore, formatRecoveryAge } from '@/lib/recovery-utils';

export const dynamic = 'force-dynamic';

// Get the data directory path
const getDataDirectory = () => {
  const projectRoot = process.cwd();
  return path.join(projectRoot, 'data');
};

// Helper to read checkpoints from a directory in parallel
async function readCheckpointsFromDir(dir: string, type: string): Promise<any[]> {
  try {
    const files = await fs.readdir(dir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const checkpoints = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const content = await fs.readFile(path.join(dir, file), 'utf8');
          const checkpoint = JSON.parse(content);
          checkpoint.type = checkpoint.type || type;
          return checkpoint;
        } catch {
          return null; // Skip invalid files
        }
      })
    );

    return checkpoints.filter(Boolean);
  } catch {
    return []; // Directory doesn't exist
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if Session Rescue is enabled
    const isEnabled = process.env.ENABLE_SESSION_RESCUE === 'true';
    if (!isEnabled) {
      return NextResponse.json({
        hasRecovery: false,
        reason: 'Session Rescue is disabled (set ENABLE_SESSION_RESCUE=true to enable)'
      });
    }
    
    console.log('🛟 Checking for recoverable sessions...');
    
    const dataDir = getDataDirectory();
    const sessionsDir = path.join(dataDir, 'sessions');
    
    // Check if sessions directory exists
    try {
      await fs.access(sessionsDir);
    } catch {
      return NextResponse.json({
        hasRecovery: false,
        reason: 'No previous sessions found'
      });
    }
    
    // Get all sessions
    const sessions = await fs.readdir(sessionsDir);
    if (sessions.length === 0) {
      return NextResponse.json({
        hasRecovery: false,
        reason: 'No sessions exist yet'
      });
    }
    
    // Scan all sessions for checkpoints in parallel
    const sessionPromises = sessions.map(async (sessionId) => {
      const checkpointsBaseDir = path.join(sessionsDir, sessionId, 'checkpoints');

      try {
        // Read auto and manual directories in parallel
        const [autoCheckpoints, manualCheckpoints] = await Promise.all([
          readCheckpointsFromDir(path.join(checkpointsBaseDir, 'auto'), 'auto'),
          readCheckpointsFromDir(path.join(checkpointsBaseDir, 'manual'), 'manual')
        ]);

        return [...autoCheckpoints, ...manualCheckpoints];
      } catch (error) {
        console.warn(`Failed to read checkpoints for session ${sessionId}:`, error);
        return [];
      }
    });

    const allCheckpointArrays = await Promise.all(sessionPromises);
    const allCheckpoints = allCheckpointArrays.flat();
    
    if (allCheckpoints.length === 0) {
      return NextResponse.json({
        hasRecovery: false,
        reason: 'No checkpoints found'
      });
    }
    
    // Sort by timestamp (newest first)
    allCheckpoints.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime;
    });
    
    // Find the most recent recoverable checkpoint
    for (const checkpoint of allCheckpoints) {
      const timestamp = new Date(checkpoint.timestamp).getTime();
      
      // Check if checkpoint is recoverable (within 24 hours + meets threshold)
      if (isCheckpointRecoverable({
        id: checkpoint.id,
        sessionId: checkpoint.sessionId,
        timestamp,
        openFiles: checkpoint.openFiles || [],
        terminalHistory: checkpoint.terminalHistory || '',
        claudeContext: checkpoint.claudeContext,
        gitBranch: checkpoint.gitBranch,
        checkpointType: checkpoint.type || checkpoint.checkpointType
      })) {
        // Calculate recovery score
        const score = calculateRecoveryScore({
          id: checkpoint.id,
          sessionId: checkpoint.sessionId,
          timestamp,
          openFiles: checkpoint.openFiles || [],
          terminalHistory: checkpoint.terminalHistory || '',
          claudeContext: checkpoint.claudeContext,
          gitBranch: checkpoint.gitBranch,
          checkpointType: checkpoint.type || checkpoint.checkpointType
        });
        
        console.log(`✅ Found recoverable checkpoint: ${checkpoint.id} (score: ${score.overall}/100)`);
        
        return NextResponse.json({
          hasRecovery: true,
          recovery: {
            checkpoint: {
              id: checkpoint.id,
              sessionId: checkpoint.sessionId,
              name: checkpoint.name,
              timestamp: checkpoint.timestamp,
              type: checkpoint.type || checkpoint.checkpointType || 'manual',
              openFiles: checkpoint.openFiles || [],
              gitBranch: checkpoint.gitBranch
            },
            age: formatRecoveryAge(timestamp),
            score: {
              overall: score.overall,
              filesVerified: score.filesVerified,
              terminalComplete: score.terminalComplete,
              claudeContext: score.claudeContext,
              gitSync: score.gitSync,
              recency: score.recency
            },
            warnings: score.warnings,
            stats: {
              filesCount: (checkpoint.openFiles || []).length,
              terminalHistorySize: (checkpoint.terminalHistory || '').length,
              hasClaudeContext: !!checkpoint.claudeContext
            }
          }
        });
      }
    }
    
    // No recoverable checkpoints found
    return NextResponse.json({
      hasRecovery: false,
      reason: `Found ${allCheckpoints.length} checkpoint(s) but none are recoverable (too old or low quality)`
    });
    
  } catch (error) {
    console.error('Recovery check error:', error);
    return NextResponse.json(
      { 
        hasRecovery: false,
        error: 'Failed to check for recoverable sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
