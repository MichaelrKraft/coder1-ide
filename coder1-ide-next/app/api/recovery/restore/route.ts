/**
 * Session Rescue - Recovery Restore API
 * 
 * Restores a checkpoint from a previous session.
 * Calls the actual checkpoint restore API to load checkpoint data.
 * Marks the recovery as consumed to prevent showing the modal again.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { checkpointId, sessionId } = await request.json();
    
    if (!checkpointId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters: checkpointId and sessionId' },
        { status: 400 }
      );
    }
    
    console.log(`🛟 Restoring session from checkpoint: ${checkpointId}`);
    console.log(`🛟 Session ID: ${sessionId}`);
    
    // Call the actual checkpoint restore API to load checkpoint data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const restoreApiUrl = `${baseUrl}/api/sessions/${sessionId}/checkpoints/${checkpointId}/restore`;
    
    console.log(`📡 Calling checkpoint restore API: ${restoreApiUrl}`);
    
    const restoreResponse = await fetch(restoreApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!restoreResponse.ok) {
      const errorText = await restoreResponse.text();
      console.error(`❌ Checkpoint restore API failed: ${restoreResponse.status}`, errorText);
      return NextResponse.json(
        { 
          error: `Failed to restore checkpoint: ${restoreResponse.status}`,
          details: errorText
        },
        { status: restoreResponse.status }
      );
    }
    
    const checkpointData = await restoreResponse.json();
    console.log(`✅ Checkpoint data loaded successfully`);
    console.log(`📦 Checkpoint has files: ${!!checkpointData.checkpoint?.data?.snapshot?.files}`);
    console.log(`📦 Checkpoint has terminal: ${!!checkpointData.checkpoint?.data?.snapshot?.terminal}`);
    console.log(`📦 Checkpoint has editor: ${!!checkpointData.checkpoint?.data?.snapshot?.editor}`);
    
    // Build the restore URL with all necessary parameters
    const restoreUrl = `/ide?restored=true&checkpointId=${checkpointId}&sessionId=${sessionId}&recovery=true`;
    
    return NextResponse.json({
      success: true,
      message: 'Recovery checkpoint restored successfully',
      restoreUrl,
      checkpoint: checkpointData.checkpoint,
      sessionId,
      checkpointId
    });
    
  } catch (error) {
    console.error('Recovery restore error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to restore recovery checkpoint',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
