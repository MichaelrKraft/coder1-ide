import { NextRequest } from 'next/server';
import { queryFlowTrace } from '@/services/flowtrace/query-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, dateRange, apps, contentTypes, topK } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return Response.json({ error: 'query is required' }, { status: 400 });
    }

    const result = await queryFlowTrace(query.trim(), {
      dateRange,
      apps,
      contentTypes,
      topK,
    });

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FlowTrace API] Query error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
