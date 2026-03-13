import { NextRequest, NextResponse } from 'next/server';
import { commitContextService } from '@/services/commit-context-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '200'), 500);
    const branch = searchParams.get('branch') ?? undefined;
    const shaOnly = searchParams.get('shaOnly') === 'true';

    if (shaOnly) {
      const shas = await commitContextService.listShas(limit);
      return NextResponse.json({ contexts: shas });
    }

    let contexts;
    if (branch) {
      contexts = await commitContextService.listByBranch(branch, limit);
    } else {
      contexts = await commitContextService.listAll(limit);
    }

    return NextResponse.json({ contexts });
  } catch (err) {
    console.error('[API] GET /api/commit-contexts error:', err);
    return NextResponse.json({ error: 'Failed to list commit contexts' }, { status: 500 });
  }
}
