import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser, requireTeamMember, requireTeamAdmin } from '@/lib/auth/team-middleware';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export const dynamic = 'force-dynamic';

/**
 * GET /api/team/[teamId]/knowledge
 * List team knowledge facts from Supabase. Requires team membership.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { teamId } = await params;

    await requireTeamMember(user.id, teamId);

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('team_knowledge')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      // Table hasn't been created in Supabase yet — degrade gracefully
      if (error.message.includes('Could not find the table')) {
        return NextResponse.json({ success: true, data: [], migrationRequired: true });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401
                 : message.includes('Not a team member') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/**
 * DELETE /api/team/[teamId]/knowledge
 * Soft-delete a team knowledge fact. Requires admin.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { teamId } = await params;

    await requireTeamAdmin(user.id, teamId);

    const body = await request.json();
    const { factId } = body;

    if (!factId || typeof factId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'factId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('team_knowledge')
      .update({
        is_active: false,
        deactivated_by: user.id,
        deactivated_at: new Date().toISOString(),
      })
      .eq('id', factId)
      .eq('team_id', teamId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401
                 : message.includes('Not a team member') ? 403
                 : message.includes('Admin') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
