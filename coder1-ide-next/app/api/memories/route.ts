import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { memories } from '@/lib/db/schema';
import { eq, desc, like, or } from 'drizzle-orm';

// Auto-categorize memory based on content
function categorizeMemory(content: string): string {
  const lower = content.toLowerCase();
  
  if (lower.includes('http://') || lower.includes('https://')) return 'link';
  if (lower.includes('book:') || lower.includes('reading:')) return 'book';
  if (lower.includes('todo:') || lower.includes('task:')) return 'task';
  if (lower.includes('idea:') || lower.startsWith('what if')) return 'idea';
  
  return 'note';
}

// POST /api/memories - Create new memory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, category } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const finalCategory = category || categorizeMemory(content);

    const newMemory = await db.insert(memories).values({
      content: content.trim(),
      category: finalCategory,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json(newMemory[0], { status: 201 });
  } catch (error) {
    console.error('Error creating memory:', error);
    return NextResponse.json(
      { error: 'Failed to create memory' },
      { status: 500 }
    );
  }
}

// GET /api/memories - List/search memories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = db.select().from(memories);

    // Filter by category if provided
    if (category && category !== 'all') {
      query = query.where(eq(memories.category, category));
    }

    // Search in content if search term provided
    if (search) {
      query = query.where(like(memories.content, `%${search}%`));
    }

    // Order by most recent first
    query = query.orderBy(desc(memories.createdAt)).limit(limit);

    const results = await query;

    return NextResponse.json({ memories: results, count: results.length });
  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}
