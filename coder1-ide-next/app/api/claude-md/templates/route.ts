import { NextResponse } from 'next/server';
import { loadBuiltInTemplates } from '@/lib/claude-md-template-loader';

export const dynamic = 'force-dynamic';

/**
 * GET /api/claude-md/templates
 *
 * Returns all built-in CLAUDE.md templates loaded from disk.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const templates = loadBuiltInTemplates();
    return NextResponse.json({ templates });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[GET /api/claude-md/templates]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
