/**
 * Admin API - User Management
 * Provides user data from both local database and GHL CRM
 */

import { NextRequest, NextResponse } from 'next/server';
import { ghlService } from '@/services/gohighlevel-service';
import { getAuthDatabase } from '@/lib/auth/db';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth/jwt';

// Admin check middleware
async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) return false;

    const payload = verifyToken(token);
    if (!payload) return false;

    // Check if user is admin (you might want to add an isAdmin field to users table)
    // For now, check if it's a specific admin email
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
    return adminEmails.includes(payload.email);
  } catch (error) {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    if (!await isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const tier = searchParams.get('tier') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Get users from local database
    const db = getAuthDatabase();
    
    let query = 'SELECT * FROM users';
    const params: any[] = [];
    const conditions: string[] = [];

    if (search) {
      conditions.push('(email LIKE ? OR username LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (tier) {
      conditions.push('subscription_tier = ?');
      params.push(tier);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY ${sortBy} ${sortOrder}`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, (page - 1) * limit);

    const users = db.prepare(query).all(...params);

    // Get count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countParams = params.slice(0, -2); // Remove limit and offset
    const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

    // Enhance with GHL data if available
    if (process.env.ENABLE_GHL_INTEGRATION === 'true' && ghlService.isReady()) {
      const enhancedUsers = await Promise.all(
        users.map(async (user: any) => {
          try {
            const ghlContact = await ghlService.getContactByEmail(user.email);
            return {
              ...user,
              ghlData: ghlContact ? {
                id: ghlContact.id,
                tags: ghlContact.tags,
                customFields: ghlContact.customFields,
              } : null,
            };
          } catch (error) {
            return user;
          }
        })
      );
      users.splice(0, users.length, ...enhancedUsers);
    }

    // Get statistics
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN subscription_tier = 'free' THEN 1 END) as freeUsers,
        COUNT(CASE WHEN subscription_tier = 'pro' THEN 1 END) as proUsers,
        COUNT(CASE WHEN subscription_tier = 'team' THEN 1 END) as teamUsers,
        COUNT(CASE WHEN created_at > datetime('now', '-7 days') THEN 1 END) as newThisWeek,
        COUNT(CASE WHEN last_login > datetime('now', '-1 day') THEN 1 END) as activeToday
      FROM users
    `).get() as any;

    // Get project statistics
    const projectStats = db.prepare(`
      SELECT 
        COUNT(*) as totalProjects,
        COUNT(DISTINCT user_id) as usersWithProjects
      FROM projects
    `).get() as any;

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        ...stats,
        ...projectStats,
      },
    });
  } catch (error) {
    logger.error('Failed to get admin users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export user data as CSV
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    if (!await isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'export') {
      // Get all users
      const db = getAuthDatabase();
      const users = db.prepare(`
        SELECT 
          id,
          email,
          username,
          subscription_tier,
          email_verified,
          created_at,
          last_login
        FROM users
        ORDER BY created_at DESC
      `).all();

      // Convert to CSV
      const csv = [
        'ID,Email,Username,Subscription,Verified,Signup Date,Last Login',
        ...users.map((u: any) => 
          `"${u.id}","${u.email}","${u.username}","${u.subscription_tier}","${u.email_verified}","${u.created_at}","${u.last_login || ''}"`
        )
      ].join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="coderone-users-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (action === 'sync-ghl') {
      // Trigger batch sync with GHL
      if (process.env.ENABLE_GHL_INTEGRATION === 'true') {
        const { ghlUserSync } = await import('@/services/ghl-user-sync');
        const results = await ghlUserSync.batchSyncAllUsers();
        return NextResponse.json({
          success: true,
          results,
        });
      } else {
        return NextResponse.json(
          { error: 'GHL integration not enabled' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Failed to process admin action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}