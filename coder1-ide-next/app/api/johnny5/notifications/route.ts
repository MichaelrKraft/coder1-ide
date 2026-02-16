/**
 * Johnny5 Notifications API
 *
 * GET  /api/johnny5/notifications — Fetch undelivered notifications
 * PATCH /api/johnny5/notifications — Mark notifications as delivered
 */

import { NextResponse } from 'next/server';
import { getDb, initializeDb } from '@/lib/johnny5-db';

export async function GET() {
  try {
    await initializeDb();
    const db = getDb();

    const notifications = db.prepare(`
      SELECT id, task_id, message, type, created_at
      FROM notifications
      WHERE user_id = 'default' AND delivered = 0
      ORDER BY created_at DESC
      LIMIT 50
    `).all();

    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    console.error('[Notifications] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await initializeDb();
    const db = getDb();

    const body = await request.json();
    const ids: string[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    const placeholders = ids.map(() => '?').join(',');
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE notifications
      SET delivered = 1, delivered_at = ?
      WHERE id IN (${placeholders}) AND user_id = 'default'
    `).run(now, ...ids);

    return NextResponse.json({ success: true, marked: ids.length });
  } catch (error) {
    console.error('[Notifications] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
