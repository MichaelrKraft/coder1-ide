import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/auth/supabase-db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminToken = process.env.ALPHA_ADMIN_TOKEN || 'coder1-alpha-2025';

    if (!authHeader || !authHeader.includes(adminToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const { data: signups, error } = await supabase
      .from('alpha_waitlist')
      .select('id, email, name, reddit_username, signup_date, invite_sent, invite_sent_date, invite_code, source, notes')
      .order('signup_date', { ascending: false });

    if (error) throw error;

    const headers = [
      'ID', 'Email', 'Name', 'Reddit Username', 'Signup Date',
      'Invite Sent', 'Invite Date', 'Invite Code', 'Source', 'Notes',
    ];

    const csvRows = [headers.join(',')];

    for (const signup of signups ?? []) {
      const row = [
        signup.id,
        `"${signup.email}"`,
        `"${signup.name || ''}"`,
        `"${signup.reddit_username || ''}"`,
        signup.signup_date,
        signup.invite_sent ? 'Yes' : 'No',
        signup.invite_sent_date || '',
        `"${signup.invite_code || ''}"`,
        signup.source,
        `"${signup.notes || ''}"`,
      ];
      csvRows.push(row.join(','));
    }

    return new NextResponse(csvRows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="alpha-waitlist-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error: any) {
    console.error('[Waitlist Export] Error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: error.message },
      { status: 500 }
    );
  }
}
