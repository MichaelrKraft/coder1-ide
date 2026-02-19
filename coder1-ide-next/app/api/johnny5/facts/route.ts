/**
 * GET /api/johnny5/facts
 *
 * Search and retrieve extracted facts from the Second Brain.
 *
 * Query params:
 *   ?q=<string>    — keyword search (uses ranked scoring: confidence × recency × relevance)
 *   ?type=<string> — filter by fact_type: personal | preference | project | technical | goal
 *   ?limit=<number> — max results (default: 20, max: 100)
 *
 * Note: ?q and ?type are mutually exclusive — ?q takes priority when both are provided.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Johnny5APIResponse } from '@/types/johnny5';
import {
  getRelevantFactsRanked,
  getFactsByType,
  type ExtractedFact,
} from '@/services/memory/fact-extraction-service';

export const dynamic = 'force-dynamic';

type FactType = ExtractedFact['type'];

const VALID_TYPES: FactType[] = ['personal', 'preference', 'project', 'technical', 'goal'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const typeParam = searchParams.get('type');
    // parseInt NaN guard: '?limit=abc' → NaN → fallback to 20
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20') || 20, 100);
    const userId = 'default';

    // Validate type param if provided
    const type = (typeParam && VALID_TYPES.includes(typeParam as FactType))
      ? (typeParam as FactType)
      : null;

    let facts: unknown[];

    if (q) {
      // Ranked search: confidence × recency × keyword relevance
      facts = await getRelevantFactsRanked(q, limit, userId);
    } else if (type) {
      // Type-filtered (returns ExtractedFact[] — less fields than ranked)
      facts = await getFactsByType(type, limit, userId);
    } else {
      // Default: ranked with empty query — sorts by confidence × recency
      facts = await getRelevantFactsRanked('', limit, userId);
    }

    const response: Johnny5APIResponse<{ facts: unknown[]; total: number }> = {
      success: true,
      data: { facts, total: facts.length },
      timestamp: new Date(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Johnny5 Facts API] Error:', error);

    const response: Johnny5APIResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve facts',
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
