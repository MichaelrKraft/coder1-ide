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
      
      return NextResponse.json({
        success: true,
        checkpoint: checkpointData,
        message: 'Checkpoint data retrieved for restoration'
      });
      
    } catch (error) {
      console.error('Checkpoint file not found:', checkpointFile);
      return NextResponse.json(
        { error: 'Checkpoint not found' },
        { status: 404 }
      );
    }
    
  } catch (error) {
    console.error('Restore checkpoint API error:', error);
    return NextResponse.json(
      { error: 'Failed to restore checkpoint' },
      { status: 500 }
    );
  }
}