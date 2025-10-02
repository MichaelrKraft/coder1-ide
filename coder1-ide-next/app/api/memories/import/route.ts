/**
 * Memory Import API Route
 * POST /api/memories/import - Import memories from JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryDb } from '@/lib/db/memory-database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the import data
    if (!body.data && !body.memories) {
      return NextResponse.json(
        { success: false, error: 'No import data provided' },
        { status: 400 }
      );
    }

    // Handle both formats: direct memories array or wrapped in data object
    const importData = body.data || { memories: body.memories };
    
    if (!importData.memories || !Array.isArray(importData.memories)) {
      return NextResponse.json(
        { success: false, error: 'Invalid import format: memories array required' },
        { status: 400 }
      );
    }

    // Perform the import
    const result = memoryDb.importMemories(JSON.stringify(importData));

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.imported} memories`,
      imported: result.imported,
      failed: result.failed,
      total: importData.memories.length
    });
  } catch (error) {
    console.error('Error importing memories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import memories: ' + (error as Error).message },
      { status: 500 }
    );
  }
}