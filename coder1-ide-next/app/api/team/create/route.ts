import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/team-middleware';
import { createTeam, getTeamBySlug } from '@/lib/auth/db';

/**
 * POST /api/team/create
 * Create a new team. Any authenticated user can create teams.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Team name is required' },
        { status: 400 }
      );
    }

    // Auto-generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    // Check for slug uniqueness
    const existing = getTeamBySlug(slug);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A team with this name already exists' },
        { status: 409 }
      );
    }

    const team = createTeam(name.trim(), slug, user.id);

    return NextResponse.json({ success: true, data: team });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
