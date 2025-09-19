import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Return rollback status - this can be expanded later with actual rollback functionality
    const rollbackStatus = {
      success: true,
      rollback: {
        enabled: false,
        lastBackup: null,
        autoBackup: false,
        maxBackups: 10,
        currentBackups: 0
      }
    };

    return NextResponse.json(rollbackStatus);
  } catch (error) {
    console.error('Rollback status API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rollback status' },
      { status: 500 }
    );
  }
}