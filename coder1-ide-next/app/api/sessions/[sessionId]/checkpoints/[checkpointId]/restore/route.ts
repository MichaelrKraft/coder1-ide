import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { processCheckpointDataForRestore } from '@/lib/checkpoint-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string; checkpointId: string } }
) {
  try {
    const { sessionId, checkpointId } = params;
    
    // Read checkpoint data from local storage
    const dataDir = path.join(process.cwd(), 'data');
    const checkpointsDir = path.join(dataDir, 'sessions', sessionId, 'checkpoints');
    const checkpointFile = path.join(checkpointsDir, `${checkpointId}.json`);
    
    try {
      const checkpointData = JSON.parse(await fs.readFile(checkpointFile, 'utf8'));
      
      // Apply filtering to ensure clean restore data
      // 🚨 CRITICAL: Now uses async filtering to prevent 134+ second event loop blocks
      const filteredCheckpoint = await processCheckpointDataForRestore(checkpointData);
      
      return NextResponse.json({
        success: true,
        checkpoint: filteredCheckpoint,
        message: 'Checkpoint data retrieved for restoration (filtered asynchronously)'
      });
      
    } catch (error) {
      // logger?.error('Checkpoint file not found:', checkpointFile);
      return NextResponse.json(
        { error: 'Checkpoint not found' },
        { status: 404 }
      );
    }
    
  } catch (error) {
    // logger?.error('Restore checkpoint API error:', error);
    return NextResponse.json(
      { error: 'Failed to restore checkpoint' },
      { status: 500 }
    );
  }
}