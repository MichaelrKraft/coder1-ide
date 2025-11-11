import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Manual Memory Export API
 * 
 * Triggers manual export of all memory systems to Claude Skills directory.
 * Useful for testing and on-demand updates.
 */
export async function GET(request: NextRequest) {
  try {
    // Import memory exporter (dynamic import for server-side)
    const { memoryExporter } = await import('@/services/memory-exporter');
    
    // Trigger export
    await memoryExporter.exportAll();
    
    // Get stats
    const stats = memoryExporter.getStats();
    
    return NextResponse.json({
      success: true,
      message: 'Memory export completed successfully',
      exportDir: stats.exportDir,
      lastExportTime: stats.lastExportTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in manual memory export:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get export stats
 */
export async function POST(request: NextRequest) {
  try {
    const { memoryExporter } = await import('@/services/memory-exporter');
    const stats = memoryExporter.getStats();
    
    return NextResponse.json({
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting memory export stats:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
