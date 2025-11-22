import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Memory Health Check API
 * 
 * Simple endpoint to check if Memory Orchestrator is active and exporting.
 * Returns basic status for UI indicator.
 */
export async function GET(request: NextRequest) {
  try {
    // Import memory exporter
    const { memoryExporter } = await import('@/services/memory-exporter');
    
    // Get stats
    const stats = memoryExporter.getStats();
    
    // Check if export is recent (within last 2 minutes)
    const now = Date.now();
    const timeSinceExport = now - stats.lastExportTime;
    const isActive = timeSinceExport < 120000; // 2 minutes
    
    return NextResponse.json({
      active: isActive,
      lastExportTime: stats.lastExportTime,
      secondsSinceExport: Math.floor(timeSinceExport / 1000),
      exportDir: stats.exportDir,
      isExporting: stats.isExporting
    });
  } catch (error) {
    // Memory exporter not available
    return NextResponse.json({
      active: false,
      error: 'Memory exporter not initialized'
    }, { status: 503 });
  }
}
