/**
 * Memory Search API Route
 * POST /api/memories/search - Search memories with full-text search
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryDb } from '@/lib/db/memory-database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, ...options } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Perform full-text search
    const memories = memoryDb.searchMemories(query.trim(), options);

    return NextResponse.json({
      success: true,
      query: query.trim(),
      count: memories.length,
      data: memories
    });
  } catch (error) {
    console.error('Error searching memories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search memories' },
      { status: 500 }
    );
  }
}