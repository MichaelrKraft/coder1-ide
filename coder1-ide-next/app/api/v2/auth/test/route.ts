import { NextResponse } from 'next/server';
import { getAuthDatabase } from '@/lib/auth/db';

export async function GET() {
  try {
    const db = getAuthDatabase();
    
    // Test the database connection
    const result = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    return NextResponse.json({
      message: 'Database connection successful',
      userCount: result.count,
      tables: db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all(),
    });
  } catch (error) {
    // logger?.error('Database test error:', error);
    return NextResponse.json(
      { error: 'Database connection failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}