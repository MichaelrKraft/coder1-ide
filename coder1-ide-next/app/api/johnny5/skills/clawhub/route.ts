import { NextRequest, NextResponse } from 'next/server';
import type { Johnny5APIResponse, ClawHubSearchResponse } from '@/types/johnny5';
import { searchSkills } from '@/services/johnny5/clawhub-adapter';

/**
 * GET /api/johnny5/skills/clawhub
 *
 * Search and browse community skills from the Skills Store.
 *
 * Query params:
 * - q: search query (required)
 * - limit: max results (default 20)
 * - cursor: pagination cursor
 * - sort: sort order (trending, downloads, stars, updated)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const cursor = searchParams.get('cursor') || undefined;
  const sort = searchParams.get('sort') || undefined;

  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Missing required parameter: q', timestamp: new Date() },
      { status: 400 }
    );
  }

  try {
    const results = await searchSkills(query, { limit, cursor, sort });

    const response: Johnny5APIResponse<ClawHubSearchResponse> = {
      success: true,
      data: results,
      timestamp: new Date(),
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';

    // Handle rate limiting specifically
    if (message.includes('Rate limited')) {
      return NextResponse.json(
        { success: false, error: message, timestamp: new Date() },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: message, timestamp: new Date() },
      { status: 500 }
    );
  }
}
