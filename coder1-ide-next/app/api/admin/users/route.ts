import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/auth/supabase-db';

export const dynamic = 'force-dynamic';

const ADMIN_TOKEN = process.env.ALPHA_ADMIN_TOKEN;

function verifyAdmin(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  const cookie = request.cookies.get('coder1-admin')?.value;
  if (cookie === ADMIN_TOKEN) return true;
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.includes(ADMIN_TOKEN)) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'waitlist';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = 25;
  const search = searchParams.get('search') || '';
  const offset = (page - 1) * limit;

  try {
    const supabase = getSupabaseClient();

    if (view === 'waitlist') {
      let query = supabase
        .from('alpha_waitlist')
        .select('id, email, name, signup_date, source, invite_sent, invite_code', { count: 'exact' })
        .order('signup_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (search) {
        query = query.ilike('email', `%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      return NextResponse.json({
        rows: data ?? [],
        total: count ?? 0,
        page,
        totalPages: Math.ceil((count ?? 0) / limit),
      });
    } else {
      // registered users
      let query = supabase
        .from('users')
        .select('id, email, username, created_at, subscription_tier, subscription_status, coder1_pro_active, last_login', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (search) {
        query = query.ilike('email', `%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      return NextResponse.json({
        rows: data ?? [],
        total: count ?? 0,
        page,
        totalPages: Math.ceil((count ?? 0) / limit),
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Users] Error:', message);
    return NextResponse.json({ error: 'Failed to load users', details: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, table } = await request.json();
    if (!id || !table) {
      return NextResponse.json({ error: 'id and table required' }, { status: 400 });
    }
    if (table !== 'waitlist' && table !== 'users') {
      return NextResponse.json({ error: 'table must be waitlist or users' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const tableName = table === 'waitlist' ? 'alpha_waitlist' : 'users';

    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;

    console.log(`[Admin] Deleted ${table} record ${id}`);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Users Delete] Error:', message);
    return NextResponse.json({ error: 'Failed to delete', details: message }, { status: 500 });
  }
}
