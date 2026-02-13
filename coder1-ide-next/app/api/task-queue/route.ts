import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

// Database singleton
let db: Database.Database | null = null;

function getDatabase(): Database.Database {
  if (db) return db;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'task-queue.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Apply schema
  const schemaPath = path.join(process.cwd(), 'lib', 'db', 'task-queue-schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
  }

  return db;
}

interface TaskQueueItem {
  id: number;
  task_text: string;
  is_urgent: number;
  priority: number;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// GET - Retrieve all pending tasks ordered by priority
export async function GET() {
  try {
    const database = getDatabase();
    const tasks = database.prepare(`
      SELECT * FROM task_queue
      WHERE status = 'pending'
      ORDER BY is_urgent DESC, priority DESC, created_at ASC
    `).all() as TaskQueueItem[];

    return NextResponse.json({
      success: true,
      tasks: tasks.map(t => ({
        ...t,
        is_urgent: Boolean(t.is_urgent)
      })),
      count: tasks.length
    });
  } catch (error) {
    console.error('Task queue GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve tasks' },
      { status: 500 }
    );
  }
}

// POST - Add new task
export async function POST(request: NextRequest) {
  try {
    const { task_text } = await request.json();

    if (!task_text || typeof task_text !== 'string' || !task_text.trim()) {
      return NextResponse.json(
        { success: false, error: 'task_text is required' },
        { status: 400 }
      );
    }

    const database = getDatabase();

    // Detect "urgent" keyword (case-insensitive)
    const isUrgent = /urgent/i.test(task_text) ? 1 : 0;

    const result = database.prepare(`
      INSERT INTO task_queue (task_text, is_urgent, priority, status)
      VALUES (?, ?, 0, 'pending')
    `).run(task_text.trim(), isUrgent);

    const newTask = database.prepare(
      'SELECT * FROM task_queue WHERE id = ?'
    ).get(result.lastInsertRowid) as TaskQueueItem;

    return NextResponse.json({
      success: true,
      task: {
        ...newTask,
        is_urgent: Boolean(newTask.is_urgent)
      }
    });
  } catch (error) {
    console.error('Task queue POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add task' },
      { status: 500 }
    );
  }
}

// PATCH - Update task (reorder, change status)
export async function PATCH(request: NextRequest) {
  try {
    const { id, priority, status } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const database = getDatabase();

    // Build dynamic update
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (typeof priority === 'number') {
      updates.push('priority = ?');
      params.push(priority);
    }

    if (status) {
      updates.push('status = ?');
      params.push(status);

      if (status === 'in_progress') {
        updates.push('started_at = datetime("now")');
      } else if (status === 'completed') {
        updates.push('completed_at = datetime("now")');
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    params.push(id);
    database.prepare(`
      UPDATE task_queue
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...params);

    const updatedTask = database.prepare(
      'SELECT * FROM task_queue WHERE id = ?'
    ).get(id) as TaskQueueItem;

    return NextResponse.json({
      success: true,
      task: updatedTask ? {
        ...updatedTask,
        is_urgent: Boolean(updatedTask.is_urgent)
      } : null
    });
  } catch (error) {
    console.error('Task queue PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE - Remove task
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const database = getDatabase();
    database.prepare('DELETE FROM task_queue WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task queue DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}

// PUT - Reorder tasks (bulk update priorities)
export async function PUT(request: NextRequest) {
  try {
    const { taskOrder } = await request.json();

    if (!Array.isArray(taskOrder)) {
      return NextResponse.json(
        { success: false, error: 'taskOrder array is required' },
        { status: 400 }
      );
    }

    const database = getDatabase();

    // Update priorities based on position in array
    // Higher priority = earlier in queue
    const updateStmt = database.prepare(
      'UPDATE task_queue SET priority = ? WHERE id = ?'
    );

    const trx = database.transaction(() => {
      taskOrder.forEach((taskId, index) => {
        // Reverse priority so first item has highest priority
        updateStmt.run(taskOrder.length - index, taskId);
      });
    });

    trx();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task queue PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder tasks' },
      { status: 500 }
    );
  }
}
