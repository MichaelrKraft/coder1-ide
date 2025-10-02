/**
 * Memory API Routes - Individual memory operations
 * GET /api/memories/[id] - Get specific memory
 * PUT /api/memories/[id] - Update memory
 * DELETE /api/memories/[id] - Delete memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryDb } from '@/lib/db/memory-database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid memory ID' },
        { status: 400 }
      );
    }

    const memory = memoryDb.getMemory(id);
    
    if (!memory) {
      return NextResponse.json(
        { success: false, error: 'Memory not found' },
        { status: 404 }
      );
    }

    // Include related data
    const events = memoryDb.getMemoryEvents(id);
    const relatedMemories = memoryDb.getRelatedMemories(id);

    return NextResponse.json({
      success: true,
      data: {
        ...memory,
        events,
        relatedMemories
      }
    });
  } catch (error) {
    console.error('Error getting memory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get memory' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid memory ID' },
        { status: 400 }
      );
    }

    // Prepare update data (only include fields that are provided)
    const updates: any = {};
    
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.type !== undefined) updates.type = body.type;
    if (body.confidence !== undefined) updates.confidence = body.confidence;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.context !== undefined) updates.context = body.context;
    if (body.starred !== undefined) updates.starred = body.starred;
    if (body.templateType !== undefined) updates.templateType = body.templateType;

    const memory = memoryDb.updateMemory(id, updates);
    
    if (!memory) {
      return NextResponse.json(
        { success: false, error: 'Memory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: memory
    });
  } catch (error) {
    console.error('Error updating memory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update memory' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const searchParams = request.nextUrl.searchParams;
    const permanent = searchParams.get('permanent') === 'true';
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid memory ID' },
        { status: 400 }
      );
    }

    const deleted = memoryDb.deleteMemory(id, !permanent);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Memory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: permanent ? 'Memory permanently deleted' : 'Memory soft deleted'
    });
  } catch (error) {
    console.error('Error deleting memory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete memory' },
      { status: 500 }
    );
  }
}