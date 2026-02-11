import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'db', 'alpha-waitlist.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
function getDatabase() {
  const db = new Database(DB_PATH);
  
  // Create table if not exists
  const schema = fs.readFileSync(
    path.join(process.cwd(), 'db', 'alpha-waitlist-schema.sql'),
    'utf-8'
  );
  db.exec(schema);
  
  return db;
}

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fullName, name, redditUsername, source } = body;
    const displayName = fullName || name; // Support both fullName (new) and name (legacy)

    // Validation
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Insert into database
    const db = getDatabase();
    
    try {
      const stmt = db.prepare(`
        INSERT INTO alpha_waitlist (
          email, name, reddit_username, source, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        email.toLowerCase().trim(),
        displayName || null,
        redditUsername || null,
        source || 'website',
        ipAddress,
        userAgent
      );

      db.close();

      return NextResponse.json({
        success: true,
        message: 'Successfully added to waitlist',
        id: result.lastInsertRowid
      });

    } catch (dbError: any) {
      db.close();
      
      // Handle duplicate email
      if (dbError.message?.includes('UNIQUE constraint failed')) {
        return NextResponse.json(
          { 
            error: 'Email already registered',
            message: 'This email is already on the waitlist'
          },
          { status: 409 }
        );
      }
      
      throw dbError;
    }

  } catch (error: any) {
    console.error('Waitlist signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();

    const stmt = db.prepare('SELECT COUNT(*) as count FROM alpha_waitlist');
    const result = stmt.get() as { count: number };

    db.close();

    return NextResponse.json({
      totalSignups: result.count,
      message: 'Waitlist statistics'
    });

  } catch (error: any) {
    console.error('Waitlist stats error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve statistics' },
      { status: 500 }
    );
  }
}

// DELETE - Remove email from waitlist (dev only)
export async function DELETE(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM alpha_waitlist WHERE email = ?');
    const result = stmt.run(email.toLowerCase().trim());
    db.close();

    return NextResponse.json({
      success: true,
      deleted: result.changes > 0,
      message: result.changes > 0
        ? `Removed ${email} from waitlist`
        : 'Email not found in waitlist'
    });

  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete', details: error.message },
      { status: 500 }
    );
  }
}
