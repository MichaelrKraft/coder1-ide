import { NextRequest, NextResponse } from 'next/server';
import SessionCleanupUtility from '@/utils/session-cleanup';

export async function POST(request: NextRequest) {
  try {
    const cleanup = new SessionCleanupUtility();
    
    // Run the full cleanup process
    await cleanup.runFullCleanup();
    
    return NextResponse.json({
      success: true,
      message: 'Session cleanup completed successfully'
    });
    
  } catch (error) {
    console.error('Session cleanup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run session cleanup'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cleanup = new SessionCleanupUtility();
    
    // Just find duplicates without cleaning
    const duplicates = await cleanup.findDuplicateSessions();
    
    return NextResponse.json({
      success: true,
      duplicateGroups: duplicates,
      totalDuplicates: duplicates.reduce((sum, group) => sum + group.sessions.length - 1, 0)
    });
    
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check for duplicate sessions'
      },
      { status: 500 }
    );
  }
}