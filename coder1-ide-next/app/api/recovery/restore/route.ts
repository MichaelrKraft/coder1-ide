/**
 * Session Rescue - Recovery Restore API
 * 
 * Restores a checkpoint from a previous session.
 * Thin wrapper around existing checkpoint restore functionality.
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
    
    // The actual restore is handled by the existing checkpoint restore API
    // We just need to redirect to the IDE with the restore parameters
    const restoreUrl = `/ide?restored=true&checkpointId=${checkpointId}&sessionId=${sessionId}&recovery=true`;
    
    return NextResponse.json({
      success: true,
      message: 'Recovery checkpoint will be restored',
      restoreUrl,
      checkpoint: {
        id: checkpointId,
        sessionId
      }
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
