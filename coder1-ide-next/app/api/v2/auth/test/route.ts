import { NextResponse } from 'next/server';
import { getAuthDatabase } from '@/lib/auth';

export async function GET() {
  try {
    const db = await getAuthDatabase();

    // Test the database connection
    // When using Supabase, getAuthDatabase returns the Supabase client
    // When using SQLite, it returns the better-sqlite3 instance
    // This test route is backend-aware for diagnostics
    const AUTH_BACKEND = process.env.AUTH_BACKEND || 'sqlite';

    if (AUTH_BACKEND === 'supabase') {
      // Supabase: use the client to query
      const { count, error } = await db.from('users').select('*', { count: 'exact', head: true });
      if (error) throw error;

      return NextResponse.json({
        message: 'Database connection successful',
        backend: 'supabase',
        userCount: count ?? 0,
      });
    } else {
      // SQLite: use prepare().get()
      const result = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

      return NextResponse.json({
        message: 'Database connection successful',
        backend: 'sqlite',
        userCount: result.count,
        tables: db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all(),
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Database connection failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}