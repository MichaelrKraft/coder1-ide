import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { memories } from '@/lib/db/schema';
import { desc, like, or, and, eq } from 'drizzle-orm';

// Auto-categorize based on content
function categorizeMemory(content: string): string {
  const lowerContent = content.toLowerCase();

  // URL detection
  if (/https?:\/\/[^\s]+/.test(content)) {
    return 'link';
  }

  // Book detection
  if (/\b(book|read|reading|author|isbn)\b/.test(lowerContent)) {
    return 'book';
  }

  // Task detection
  if (/\b(todo|task|need to|should|must|remind|deadline)\b/.test(lowerContent)) {
    return 'task';
  }

  // Idea detection
  if (/\b(idea|concept|what if|maybe|could|brainstorm)\b/.test(lowerContent)) {
    return 'idea';
  }

  // Default to note
  return 'note';
}

// POST - Create new memory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, category: manualCategory } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Auto-categorize if no category provided
    const category = manualCategory || categorizeMemory(content);

    const [newMemory] = db.insert(memories).values({
      content: content.trim(),
      category,
    }).returning().all();

    return NextResponse.json({
      success: true,
      memory: newMemory
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating memory:', error);
    return NextResponse.json(
      { error: 'Failed to create memory' },
      { status: 500 }
    );
  }
}

// GET - List and search memories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const categoryFilter = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let results;

    if (query && query.trim().length > 0) {
      // Search with optional category filter
      const searchPattern = `%${query}%`;
      const conditions = [like(memories.content, searchPattern)];

      if (categoryFilter && categoryFilter !== 'all') {
        conditions.push(eq(memories.category, categoryFilter));
      }

      results = db
        .select()
        .from(memories)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .orderBy(desc(memories.createdAt))
        .limit(limit)
        .offset(offset)
        .all();
    } else if (categoryFilter && categoryFilter !== 'all') {
      // Filter by category only
      results = db
        .select()
        .from(memories)
        .where(eq(memories.category, categoryFilter))
        .orderBy(desc(memories.createdAt))
        .limit(limit)
        .offset(offset)
        .all();
    } else {
      // Get all memories
      results = db
        .select()
        .from(memories)
        .orderBy(desc(memories.createdAt))
        .limit(limit)
        .offset(offset)
        .all();
    }

    return NextResponse.json({
      success: true,
      memories: results,
      count: results.length,
    });

  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}
