import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db', 'alpha-waitlist.db');

// Mark as dynamic route since it uses request.headers
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Simple auth check - require admin token
    const authHeader = request.headers.get('authorization');
    const adminToken = process.env.ALPHA_ADMIN_TOKEN || 'coder1-alpha-2025';
    
    if (!authHeader || !authHeader.includes(adminToken)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = new Database(DB_PATH);
    
    const signups = db.prepare(`
      SELECT 
        id,
        email,
        name,
        reddit_username,
        signup_date,
        invite_sent,
        invite_sent_date,
        invite_code,
        source,
        notes
      FROM alpha_waitlist
      ORDER BY signup_date DESC
    `).all();

    db.close();

    // Generate CSV
    const headers = [
      'ID', 'Email', 'Name', 'Reddit Username', 'Signup Date',
      'Invite Sent', 'Invite Date', 'Invite Code', 'Source', 'Notes'
    ];

    const csvRows = [headers.join(',')];
    
    for (const signup of signups as any[]) {
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
        `"${signup.notes || ''}"`
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="alpha-waitlist-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: error.message },
      { status: 500 }
    );
  }
}
