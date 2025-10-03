import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

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
      
      // ✅ NO FILTERING NEEDED: Data is already filtered during save operation
      // This makes restoration INSTANT (was taking 58+ seconds with async filtering)
      // The checkpoint save operation now filters terminal history asynchronously
      
      return NextResponse.json({
        success: true,
        checkpoint: checkpointData,
        message: 'Checkpoint data retrieved for instant restoration (pre-filtered)'
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