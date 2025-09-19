import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Return basic stats - this can be expanded later
    const stats = {
      success: true,
      sessions: 0,
      files: 0,
      terminals: 0,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}