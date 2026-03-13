import { NextRequest } from 'next/server';
import { generateWorkSummary } from '@/services/flowtrace/query-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateRange, focus, format } = body;

    if (!dateRange?.start || !dateRange?.end) {
      return Response.json(
        { error: 'dateRange.start and dateRange.end (unix timestamps) are required' },
        { status: 400 }
      );
    }

    const markdown = await generateWorkSummary({ dateRange, focus, format });

    return Response.json({ markdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FlowTrace API] Generate docs error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
