/**
 * Memory Statistics API Route
 * GET /api/memories/stats - Get memory system statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryDb } from '@/lib/db/memory-database';

export async function GET(request: NextRequest) {
  try {
    const stats = memoryDb.getStatistics();

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting memory statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get statistics' },
      { status: 500 }
    );
  }
}